import prisma from '../config/prisma.js';
import logger from '../config/logger.js';
import { generateAndStoreQRCode } from '../services/qrCodeService.js';
import { generateShortId } from '../services/shortIdService.js';
import { getActiveReportedFoundGearIds } from '../services/reportedFoundService.js';
import { categoryName, normalizeGearCategory } from '../services/normalize.js';
import { parsePagination } from '../utils/pagination.js';

/** Matches the AAA-XXX short ID format */
const SHORT_ID_RE = /^[A-Za-z]{3}-\d{3}$/;

export async function listGear(req, res, next) {
  try {
    const { category, status, search } = req.query;
    const { page, pageSize, skip, take } = parsePagination(req.query);
    const where = {};

    // Only compute reported-found set when the caller needs it:
    // 1. Filtering by REPORTED_FOUND status, or
    // 2. Admin users who see the reportedFound badge on every item
    const needReportedFound = status === 'REPORTED_FOUND' || req.profile?.role === 'ADMIN';
    const activeReportedFoundIds = needReportedFound
      ? await getActiveReportedFoundGearIds()
      : new Set();

    // For the special REPORTED_FOUND filter, show only actively-reported items
    if (status === 'REPORTED_FOUND') {
      where.id = { in: [...activeReportedFoundIds] };
      // Exclude items already confirmed LOST by admin
      where.loanStatus = { not: 'LOST' };
    } else if (status) {
      where.loanStatus = status;
    }

    if (category) where.category = { name: category };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { shortId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [gear, total] = await Promise.all([
      prisma.gear.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { name: true } } },
        skip,
        take,
      }),
      prisma.gear.count({ where }),
    ]);

    // Normalize response shape: return `category` as a string (legacy shape)
    const data = gear.map((g) => ({
      ...g,
      category: categoryName(g.category),
      reportedFound: activeReportedFoundIds.has(g.id),
    }));
    res.json({
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getGear(req, res, next) {
  try {
    const param = req.params.id;
    // Resolve by shortId (AAA-XXX) or fall back to UUID
    const where = SHORT_ID_RE.test(param) ? { shortId: param.toUpperCase() } : { id: param };

    const gear = await prisma.gear.findUnique({
      where,
      include: {
        loans: {
          where: { status: 'ACTIVE' },
          select: { id: true, userId: true, dueDate: true, checkoutDate: true },
        },
        category: { select: { name: true } },
      },
    });

    if (!gear) {
      return res.status(404).json({ error: 'Gear not found' });
    }

    // Non-admin users should not see who currently has the gear,
    // but the borrower themselves needs to know their own loan is active.
    if (!req.profile || req.profile.role !== 'ADMIN') {
      gear.loans = gear.loans.map(({ id, userId, dueDate, checkoutDate }) => ({
        id,
        dueDate,
        checkoutDate,
        isCurrentUserLoan: req.profile ? userId === req.profile.id : false,
      }));
    }

    // Normalize category to string for legacy frontend
    normalizeGearCategory(gear);

    res.json(gear);
  } catch (err) {
    next(err);
  }
}

export async function createGear(req, res, next) {
  try {
    const { name, description, category, tags, serialNumber, defaultLoanDays } = req.body;

    // Generate shortId before creating so it can be stored atomically
    const shortId = await generateShortId(name, category);

    // If a category string was provided, ensure there's a Category record
    let categoryRecord = null;
    if (category && typeof category === 'string' && category.trim() !== '') {
      try {
        categoryRecord = await prisma.category.upsert({
          where: { name: category },
          update: {},
          create: { name: category },
        });
      } catch (catErr) {
        logger.error({ err: catErr }, 'Category upsert failed during create');
      }
    }

    const createData = {
      name,
      description: description || null,
      tags,
      // treat empty string or whitespace-only as null so DB stores NULL instead of ""
      serialNumber:
        typeof serialNumber === 'string' && serialNumber.trim() !== '' ? serialNumber.trim() : null,
      defaultLoanDays,
      shortId,
    };

    if (categoryRecord) {
      createData.category = { connect: { id: categoryRecord.id } };
    }

    const gear = await prisma.gear.create({ data: createData });

    // If we have a category record, mirror its name onto the response for the
    // legacy frontend shape.
    if (categoryRecord) {
      gear.category = categoryRecord.name;
      gear.categoryId = categoryRecord.id;
    } else {
      gear.category = null;
    }

    // Generate and store QR code (pointing to /gear/{shortId})
    try {
      const qrCodeUrl = await generateAndStoreQRCode(gear.id, gear.shortId);
      await prisma.gear.update({
        where: { id: gear.id },
        data: { qrCodeUrl },
      });
      gear.qrCodeUrl = qrCodeUrl;
    } catch (qrErr) {
      logger.error({ err: qrErr }, 'QR code generation failed');
    }

    res.status(201).json(gear);
  } catch (err) {
    next(err);
  }
}

export async function updateGear(req, res, next) {
  try {
    // shortId and loanStatus are intentionally excluded — shortId is server-generated
    // and immutable, loanStatus is changed via the dedicated status transition endpoint
    const { name, description, category, tags, serialNumber, defaultLoanDays } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (tags !== undefined) data.tags = tags;
    if (serialNumber !== undefined) {
      // convert empty string or whitespace-only to null; trim non-empty strings
      data.serialNumber =
        typeof serialNumber === 'string' && serialNumber.trim() !== '' ? serialNumber.trim() : null;
    }
    if (defaultLoanDays !== undefined) data.defaultLoanDays = Number(defaultLoanDays);

    // Handle category relation explicitly
    if (category !== undefined) {
      if (category === null || (typeof category === 'string' && category.trim() === '')) {
        // clear relation
        data.category = { disconnect: true };
      } else {
        // ensure category exists and connect
        try {
          const catRec = await prisma.category.upsert({
            where: { name: category },
            update: {},
            create: { name: category },
          });
          data.category = { connect: { id: catRec.id } };
        } catch (catErr) {
          logger.error({ err: catErr }, 'Category upsert failed on update');
        }
      }
    }

    const gear = await prisma.gear.update({
      where: { id: req.params.id },
      data,
      include: { category: { select: { name: true } } },
    });

    // Normalize category for response
    normalizeGearCategory(gear);

    res.json(gear);
  } catch (err) {
    next(err);
  }
}

export async function deleteGear(req, res, next) {
  try {
    const gearId = req.params.id;

    // Prevent deletion if gear has active loans
    const activeLoans = await prisma.loan.count({
      where: { gearItemId: gearId, status: 'ACTIVE' },
    });

    if (activeLoans > 0) {
      return res.status(409).json({ error: 'Cannot delete gear with active loans' });
    }

    await prisma.gear.delete({ where: { id: gearId } });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function reportFound(req, res, next) {
  try {
    const { contactInfo, notes, latitude, longitude } = req.body;
    const gearId = req.params.id;

    const gear = await prisma.gear.findUnique({ where: { id: gearId } });
    if (!gear) {
      return res.status(404).json({ error: 'Gear not found' });
    }

    const details = { contactInfo, notes };
    if (latitude != null && longitude != null) {
      details.latitude = latitude;
      details.longitude = longitude;
    }

    // Record the REPORT_FOUND action (always, regardless of role)
    await prisma.action.create({
      data: {
        type: 'REPORT_FOUND',
        userId: req.profile?.id || null,
        gearItemId: gearId,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        details: { contactInfo, notes },
      },
    });

    res.json({ message: 'Gear reported as found. Thank you.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Valid admin status transitions and their corresponding ActionType.
 * Key format: "FROM->TO"
 */
const VALID_TRANSITIONS = {
  'CHECKED_OUT->LOST': 'ADMIN_REPORT_LOST',
  'CHECKED_OUT->AVAILABLE': 'ADMIN_MADE_AVAILABLE',
  'CHECKED_OUT->RETIRED': 'ADMIN_RETIRED',
  'AVAILABLE->LOST': 'ADMIN_REPORT_LOST',
  'AVAILABLE->RETIRED': 'ADMIN_RETIRED',
  'LOST->AVAILABLE': 'ADMIN_MADE_AVAILABLE',
  'LOST->RETIRED': 'ADMIN_RETIRED',
  'RETIRED->LOST': 'ADMIN_REPORT_LOST',
  'RETIRED->AVAILABLE': 'ADMIN_UNRETIRED',
};

export async function changeGearStatus(req, res, next) {
  try {
    const gearId = req.params.id;
    const { newStatus } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Lock the gear row
      const [gear] = await tx.$queryRaw`
        SELECT * FROM "Gear" WHERE "id" = ${gearId} FOR UPDATE
      `;

      if (!gear) {
        throw Object.assign(new Error('Gear not found'), { status: 404 });
      }

      const transitionKey = `${gear.loanStatus}->${newStatus}`;
      const actionType = VALID_TRANSITIONS[transitionKey];

      if (!actionType) {
        throw Object.assign(
          new Error(`Invalid status transition: ${gear.loanStatus} → ${newStatus}`),
          { status: 400 },
        );
      }

      const operations = [];

      // If transitioning from CHECKED_OUT, cancel the active loan
      if (gear.loanStatus === 'CHECKED_OUT') {
        operations.push(
          tx.loan.updateMany({
            where: { gearItemId: gearId, status: 'ACTIVE' },
            data: { status: 'CANCELLED', returnDate: new Date() },
          }),
        );
        // Record loan cancellation action
        operations.push(
          tx.action.create({
            data: {
              type: 'ADMIN_CANCELLED_LOAN',
              userId: req.profile.id,
              gearItemId: gearId,
              details: { reason: `Admin changed status to ${newStatus}` },
            },
          }),
        );
      }

      // Update gear status
      operations.push(
        tx.gear.update({
          where: { id: gearId },
          data: { loanStatus: newStatus },
        }),
      );

      // Record the status change action
      operations.push(
        tx.action.create({
          data: {
            type: actionType,
            userId: req.profile.id,
            gearItemId: gearId,
            details: { previousStatus: gear.loanStatus, newStatus },
          },
        }),
      );

      await Promise.all(operations);

      // Fetch updated gear
      return tx.gear.findUnique({
        where: { id: gearId },
        include: { category: { select: { name: true } } },
      });
    });

    normalizeGearCategory(result);
    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

export async function getCategories(req, res, next) {
  try {
    const cats = await prisma.category.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    res.json(cats.map((c) => c.name));
  } catch (err) {
    next(err);
  }
}
