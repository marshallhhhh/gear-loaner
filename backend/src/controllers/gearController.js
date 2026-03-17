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

    if (category) where.category = category;
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
    });

    res.json(gear);
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

    const gear = await prisma.gear.create({
      data: {
        name,
        description: description || null,
        category: category || null,
        tags: tags || [],
        // treat empty string or whitespace-only as null so DB stores NULL instead of ""
        serialNumber: typeof serialNumber === 'string' && serialNumber.trim() !== ''
          ? serialNumber.trim()
          : null,
        defaultLoanDays: defaultLoanDays || 7,
        shortId,
      },
    });

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

    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (tags !== undefined) data.tags = tags;
    if (serialNumber !== undefined) {
      // convert empty string or whitespace-only to null; trim non-empty strings
      data.serialNumber = typeof serialNumber === 'string' && serialNumber.trim() !== ''
        ? serialNumber.trim()
        : null;
    }
    if (defaultLoanDays !== undefined) data.defaultLoanDays = defaultLoanDays;
    if (loanStatus !== undefined) data.loanStatus = loanStatus;

    const gear = await prisma.gear.update({
      where: { id: req.params.id },
      data,
    });

    await logAction({
      userId: req.profile.id,
      action: 'UPDATE',
      entity: 'Gear',
      entityId: gear.id,
      details: data,
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
