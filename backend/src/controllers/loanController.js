import prisma from '../config/prisma.js';
import { hasOverdueLoans, calculateDueDate } from '../services/loanService.js';
import { sendCheckoutConfirmation, sendReturnConfirmation } from '../services/emailService.js';
import { logAction } from '../services/auditService.js';

/** Matches the AAA-XXX short ID format */
const SHORT_ID_RE = /^[A-Za-z]{3}-\d{3}$/;

/** Resolves a gearItemId that may be a shortId or a UUID. Returns the Gear record or null. */
async function resolveGear(gearItemId) {
  const where = SHORT_ID_RE.test(gearItemId)
    ? { shortId: gearItemId.toUpperCase() }
    : { id: gearItemId };
  return prisma.gear.findUnique({ where });
}

export async function listLoans(req, res, next) {
  try {
    const { status, gearItemId, userId } = req.query;
    const where = {};

    // Members can only see their own loans
    if (req.profile.role !== 'ADMIN') {
      where.userId = req.profile.id;
    } else {
      if (userId) where.userId = userId;
    }

    if (status) where.status = status;
    if (gearItemId) where.gearItemId = gearItemId;

    const loans = await prisma.loan.findMany({
      where,
      include: {
        gearItem: { select: { id: true, name: true, category: { select: { name: true } } } },
        user: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Normalize gearItem.category to a string
    const normalized = loans.map((l) => ({
      ...l,
      gearItem: { ...l.gearItem, category: l.gearItem.category?.name || null },
    }));
    res.json(normalized);
  } catch (err) {
    next(err);
  }
}

export async function getMyLoans(req, res, next) {
  try {
    const loans = await prisma.loan.findMany({
      where: { userId: req.profile.id },
      include: {
        gearItem: { select: { id: true, name: true, category: { select: { name: true } }, qrCodeUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const normalized = loans.map((l) => ({
      ...l,
      gearItem: { ...l.gearItem, category: l.gearItem.category?.name || null },
    }));
    res.json(normalized);
  } catch (err) {
    next(err);
  }
}

export async function checkout(req, res, next) {
  try {
    const { gearItemId, durationDays, latitude, longitude, notes } = req.body;

    if (!gearItemId) {
      return res.status(400).json({ error: 'gearItemId is required' });
    }

    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'Location (latitude/longitude) is required for checkout' });
    }

    // Check for overdue loans
    if (await hasOverdueLoans(req.profile.id)) {
      return res.status(403).json({ error: 'You have overdue items. Please return them before checking out new gear.' });
    }

    // Verify gear exists and is available
    const gear = await resolveGear(gearItemId);
    if (!gear) {
      return res.status(404).json({ error: 'Gear not found' });
    }
    if (gear.loanStatus !== 'AVAILABLE') {
      return res.status(409).json({ error: 'Gear is not available for checkout' });
    }

    const dueDate = calculateDueDate(durationDays, gear.defaultLoanDays);

    // Create loan and update gear status in a transaction
    const loan = await prisma.$transaction(async (tx) => {
      const newLoan = await tx.loan.create({
        data: {
          gearItemId: gear.id,
          userId: req.profile.id,
          dueDate,
          notes: notes || null,
        },
      });

      await tx.gear.update({
        where: { id: gear.id },
        data: { loanStatus: 'CHECKED_OUT' },
      });

      // Record checkout action with location
      await tx.action.create({
        data: {
          type: 'CHECKOUT',
          userId: req.profile.id,
          gearItemId: gear.id,
          latitude,
          longitude,
        },
      });

      return newLoan;
    });

    await logAction({
      userId: req.profile.id,
      action: 'CHECKOUT',
      entity: 'Loan',
      entityId: loan.id,
      details: { gearItemId: gear.id, dueDate },
    });

    // Send confirmation email (non-blocking)
    sendCheckoutConfirmation({
      email: req.profile.email,
      gearName: gear.name,
      dueDate,
    }).catch((err) => console.error('Checkout email failed:', err.message));

    const loanWithGear = await prisma.loan.findUnique({
      where: { id: loan.id },
      include: { gearItem: { select: { id: true, name: true, category: { select: { name: true } } } } },
    });

    // Normalize category
    loanWithGear.gearItem.category = loanWithGear.gearItem.category?.name || null;
    res.status(201).json(loanWithGear);
  } catch (err) {
    next(err);
  }
}

export async function returnGear(req, res, next) {
  try {
    const loanId = req.params.id;
    const { condition, latitude, longitude, notes } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'Location (latitude/longitude) is required for return' });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { gearItem: true },
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status !== 'ACTIVE') {
      return res.status(409).json({ error: 'Loan is not active' });
    }

    // Members can only return their own loans
    if (req.profile.role !== 'ADMIN' && loan.userId !== req.profile.id) {
      return res.status(403).json({ error: 'You can only return your own loans' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.loan.update({
        where: { id: loanId },
        data: {
          status: 'RETURNED',
          returnDate: new Date(),
          notes: notes ? `${loan.notes ? loan.notes + '\n' : ''}Return: ${notes}${condition ? ` (Condition: ${condition})` : ''}` : loan.notes,
        },
      });

      await tx.gear.update({
        where: { id: loan.gearItemId },
        data: { loanStatus: 'AVAILABLE' },
      });

      // Record return action with location
      await tx.action.create({
        data: {
          type: 'RETURN',
          userId: req.profile.id,
          gearItemId: loan.gearItemId,
          latitude,
          longitude,
        },
      });
    });

    await logAction({
      userId: req.profile.id,
      action: 'RETURN',
      entity: 'Loan',
      entityId: loanId,
      details: { gearItemId: loan.gearItemId, condition },
    });

    sendReturnConfirmation({
      email: req.profile.email,
      gearName: loan.gearItem.name,
    }).catch((err) => console.error('Return email failed:', err.message));

    res.json({ message: 'Gear returned successfully' });
  } catch (err) {
    next(err);
  }
}

export async function overrideLoan(req, res, next) {
  try {
    const loanId = req.params.id;
    const { status, dueDate, notes } = req.body;

    const data = {};
    if (status) data.status = status;
    if (dueDate) data.dueDate = new Date(dueDate);
    if (status === 'RETURNED') data.returnDate = new Date();
    if (notes !== undefined) data.notes = notes;

    const loan = await prisma.loan.update({
      where: { id: loanId },
      data,
      include: { gearItem: true },
    });

    // If marking as returned, update gear status
    if (status === 'RETURNED') {
      await prisma.gear.update({
        where: { id: loan.gearItemId },
        data: { loanStatus: 'AVAILABLE' },
      });
    }

    await logAction({
      userId: req.profile.id,
      action: 'OVERRIDE',
      entity: 'Loan',
      entityId: loanId,
      details: data,
    });

    res.json(loan);
  } catch (err) {
    next(err);
  }
}
