import prisma from '../config/prisma.js';
import { generateAndStoreQRCode } from '../services/qrCodeService.js';
import { logAction } from '../services/auditService.js';

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
    const gear = await prisma.gear.findUnique({
      where: { id: req.params.id },
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

    // Non-admin users should not see who currently has the gear
    if (!req.profile || req.profile.role !== 'ADMIN') {
      gear.loans = gear.loans.map(({ id, dueDate, checkoutDate }) => ({
        id,
        dueDate,
        checkoutDate,
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

    const gear = await prisma.gear.create({
      data: {
        name,
        description: description || null,
        category: category || null,
        tags: tags || [],
        serialNumber: serialNumber || null,
        defaultLoanDays: defaultLoanDays || 7,
      },
    });

    // Generate and store QR code
    try {
      const qrCodeUrl = await generateAndStoreQRCode(gear.id);
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
    const { name, description, category, tags, serialNumber, defaultLoanDays, loanStatus } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (tags !== undefined) data.tags = tags;
    if (serialNumber !== undefined) data.serialNumber = serialNumber;
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
    const { contactInfo, notes } = req.body;
    const gearId = req.params.id;

    const gear = await prisma.gear.findUnique({ where: { id: gearId } });
    if (!gear) {
      return res.status(404).json({ error: 'Gear not found' });
    }

    await prisma.gear.update({
      where: { id: gearId },
      data: { loanStatus: 'LOST' },
    });

    await logAction({
      userId: req.profile?.id || null,
      action: 'REPORT_LOST',
      entity: 'Gear',
      entityId: gearId,
      details: { contactInfo, notes },
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
