import prisma from '../config/prisma.js';
import { generateAndStoreQRCode } from '../services/qrCodeService.js';
import { logAction } from '../services/auditService.js';
import { generateShortId } from '../services/shortIdService.js';

/** Matches the AAA-XXX short ID format */
const SHORT_ID_RE = /^[A-Za-z]{3}-\d{3}$/;

export async function listGear(req, res, next) {
  try {
    const { category, status, search } = req.query;
    const where = {};

    if (category) where.category = { name: category };
    if (status) where.loanStatus = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { shortId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const gear = await prisma.gear.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { category: { select: { name: true } } },
    });

    // Normalize response shape: return `category` as a string (legacy shape)
    const normalized = gear.map((g) => ({ ...g, category: g.category?.name || null }));
    res.json(normalized);
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
    gear.category = gear.category?.name || null;

    res.json(gear);
  } catch (err) {
    next(err);
  }
}

export async function createGear(req, res, next) {
  try {
    const { name, description, category, tags, serialNumber, defaultLoanDays } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

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
        console.error('Category upsert failed during create:', catErr.message);
      }
    }

    const createData = {
      name,
      description: description || null,
      tags: tags || [],
      // treat empty string or whitespace-only as null so DB stores NULL instead of ""
      serialNumber: typeof serialNumber === 'string' && serialNumber.trim() !== ''
        ? serialNumber.trim()
        : null,
      defaultLoanDays: defaultLoanDays || 7,
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
      console.error('QR code generation failed:', qrErr.message);
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
    if (defaultLoanDays !== undefined) data.defaultLoanDays = defaultLoanDays;
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
          console.error('Category upsert failed on update:', catErr.message);
        }
      }
    }

    const gear = await prisma.gear.update({
      where: { id: req.params.id },
      data,
      include: { category: { select: { name: true } } },
    });

    // Normalize category for response
    gear.category = gear.category?.name || null;

    // Determine audit action: use the new status value when loanStatus changed,
    // otherwise fall back to generic UPDATE.
    const statusChanged = loanStatus !== undefined && existingGear?.loanStatus !== loanStatus;
    const auditAction = statusChanged ? loanStatus : 'UPDATE';

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

    await prisma.gear.update({
      where: { id: gearId },
      data: { loanStatus: 'LOST' },
    });

    const details = { contactInfo, notes };
    if (latitude != null && longitude != null) {
      details.latitude = latitude;
      details.longitude = longitude;
    }

    // Record the REPORT_LOST action
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
    // Prefer the dedicated Category table if available
    if (prisma.category) {
      const cats = await prisma.category.findMany({ select: { name: true }, orderBy: { name: 'asc' } });
      return res.json(cats.map((c) => c.name));
    }

    // Fallback for older schema: derive categories from gear table
    const categories = await prisma.gear.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    res.json(categories.map((c) => c.category));
  } catch (err) {
    next(err);
  }
}
