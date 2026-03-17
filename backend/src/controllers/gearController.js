import prisma from '../config/prisma.js';
import logger from '../config/logger.js';
import { generateAndStoreQRCode } from '../services/qrCodeService.js';
import { logAction } from '../services/auditService.js';
import { generateShortId } from '../services/shortIdService.js';
import { getActiveReportedLostGearIds } from '../services/reportedLostService.js';
import { categoryName, normalizeGearCategory } from '../services/normalize.js';
import { parsePagination } from '../utils/pagination.js';

/** Matches the AAA-XXX short ID format */
const SHORT_ID_RE = /^[A-Za-z]{3}-\d{3}$/;

export async function listGear(req, res, next) {
  try {
    const { category, status, search } = req.query;
    const { page, pageSize, skip, take } = parsePagination(req.query);
    const where = {};

    // Only compute reported-lost set when the caller needs it:
    // 1. Filtering by REPORTED_LOST status, or
    // 2. Admin users who see the reportedLost badge on every item
    const needReportedLost = status === 'REPORTED_LOST' || req.profile?.role === 'ADMIN';
    const activeReportedLostIds = needReportedLost
      ? await getActiveReportedLostGearIds()
      : new Set();

    // For the special REPORTED_LOST filter, show only actively-reported items
    if (status === 'REPORTED_LOST') {
      where.id = { in: [...activeReportedLostIds] };
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
      reportedLost: activeReportedLostIds.has(g.id),
    }));
    res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    next(err);
  }
}

export async function getGear(req, res, next) {
  try {
    const param = req.params.id;
    // Resolve by shortId (AAA-XXX) or fall back to UUID
    const where = SHORT_ID_RE.test(param)
      ? { shortId: param.toUpperCase() }
      : { id: param };

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
      serialNumber: typeof serialNumber === 'string' && serialNumber.trim() !== ''
        ? serialNumber.trim()
        : null,
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

    await logAction({
      userId: req.profile.id,
      action: 'CREATE',
      entity: 'Gear',
      entityId: gear.id,
      details: { name },
    });

    res.status(201).json(gear);
  } catch (err) {
    next(err);
  }
}

export async function updateGear(req, res, next) {
  try {
    // shortId is intentionally excluded — it is server-generated and immutable
    const { name, description, category, tags, serialNumber, defaultLoanDays, loanStatus } = req.body;

    // Fetch current gear to detect status changes
    const existingGear = await prisma.gear.findUnique({
      where: { id: req.params.id },
      select: { loanStatus: true },
    });

    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (tags !== undefined) data.tags = tags;
    if (serialNumber !== undefined) {
      // convert empty string or whitespace-only to null; trim non-empty strings
      data.serialNumber = typeof serialNumber === 'string' && serialNumber.trim() !== ''
        ? serialNumber.trim()
        : null;
    }
    if (defaultLoanDays !== undefined) data.defaultLoanDays = Number(defaultLoanDays);
    if (loanStatus !== undefined) data.loanStatus = loanStatus;

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

    // Determine audit action: use the new status value when loanStatus changed,
    // otherwise fall back to generic UPDATE.
    const statusChanged = loanStatus !== undefined && existingGear?.loanStatus !== loanStatus;
    const auditAction = statusChanged ? loanStatus : 'UPDATE';

    // When an admin changes the status, record an Action so the gear's action
    // timeline stays consistent with checkout/return/report-lost flows.
    // This also clears the "reported lost" badge when status is changed.
    if (statusChanged) {
      await prisma.action.create({
        data: {
          type: 'STATUS_CHANGE',
          userId: req.profile.id,
          gearItemId: gear.id,
          details: { previousStatus: existingGear?.loanStatus, newStatus: loanStatus },
        },
      });
    }

    await logAction({
      userId: req.profile.id,
      action: auditAction,
      entity: 'Gear',
      entityId: gear.id,
      details: statusChanged
        ? { previousStatus: existingGear?.loanStatus, newStatus: loanStatus, ...data }
        : data,
    });

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

    await logAction({
      userId: req.profile.id,
      action: 'DELETE',
      entity: 'Gear',
      entityId: gearId,
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function reportLost(req, res, next) {
  try {
    const { contactInfo, notes, latitude, longitude } = req.body;
    const gearId = req.params.id;

    const gear = await prisma.gear.findUnique({ where: { id: gearId } });
    if (!gear) {
      return res.status(404).json({ error: 'Gear not found' });
    }

    // Only admins can actually change gear status to LOST
    if (req.profile?.role === 'ADMIN') {
      await prisma.gear.update({
        where: { id: gearId },
        data: { loanStatus: 'LOST' },
      });
    }

    const details = { contactInfo, notes };
    if (latitude != null && longitude != null) {
      details.latitude = latitude;
      details.longitude = longitude;
    }

    // Record the REPORT_LOST action (always, regardless of role)
    await prisma.action.create({
      data: {
        type: 'REPORT_LOST',
        userId: req.profile?.id || null,
        gearItemId: gearId,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        details: { contactInfo, notes },
      },
    });

    await logAction({
      userId: req.profile?.id || null,
      action: 'REPORT_LOST',
      entity: 'Gear',
      entityId: gearId,
      details,
    });

    res.json({ message: 'Gear reported as lost. Thank you.' });
  } catch (err) {
    next(err);
  }
}

export async function getCategories(req, res, next) {
  try {
    const cats = await prisma.category.findMany({ select: { name: true }, orderBy: { name: 'asc' } });
    res.json(cats.map((c) => c.name));
  } catch (err) {
    next(err);
  }
}
