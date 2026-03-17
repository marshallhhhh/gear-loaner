import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import logger from '../config/logger.js';
import { hasOverdueLoans, calculateDueDate } from '../services/loanService.js';
import { sendCheckoutConfirmation, sendReturnConfirmation } from '../services/emailService.js';
import { logAction } from '../services/auditService.js';
import { categoryName } from '../services/normalize.js';
import { parsePagination } from '../utils/pagination.js';

/** Matches the AAA-XXX short ID format */
const SHORT_ID_RE = /^[A-Za-z]{3}-\d{3}$/;

/** Resolves a gearItemId that may be a shortId or a UUID. Returns the Gear record or null. */
async function resolveGear(gearItemId) {
  const where = SHORT_ID_RE.test(gearItemId)
    ? { shortId: gearItemId.toUpperCase() }
    : { id: gearItemId };
  return prisma.gear.findUnique({ where });
}

/**
 * Resolves gear inside a transaction with a row-level lock (SELECT ... FOR UPDATE).
 * Prevents concurrent checkouts from both seeing AVAILABLE.
 */
async function resolveGearForUpdate(tx, gearItemId) {
  const isShortId = SHORT_ID_RE.test(gearItemId);
  const column = isShortId ? '"shortId"' : '"id"';
  const value = isShortId ? gearItemId.toUpperCase() : gearItemId;

  const rows = await tx.$queryRaw(
    Prisma.sql`SELECT * FROM "Gear" WHERE ${Prisma.raw(column)} = ${value} FOR UPDATE`,
  );
  return rows[0] || null;
}

export async function listLoans(req, res, next) {
  try {
    const { status, gearItemId, userId } = req.query;
    const { page, pageSize, skip, take } = parsePagination(req.query);
    const where = {};

    // Members can only see their own loans
    if (req.profile.role !== 'ADMIN') {
      where.userId = req.profile.id;
    } else {
      if (userId) where.userId = userId;
    }

    // OVERDUE is computed: active loans past their due date
    if (status === 'OVERDUE') {
      where.status = 'ACTIVE';
      where.dueDate = { lt: new Date() };
    } else if (status) {
      where.status = status;
    }
    if (gearItemId) where.gearItemId = gearItemId;

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        include: {
          gearItem: { select: { id: true, name: true, category: { select: { name: true } } } },
          user: { select: { id: true, email: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.loan.count({ where }),
    ]);

    // Normalize gearItem.category to a string
    const data = loans.map((l) => ({
      ...l,
      gearItem: { ...l.gearItem, category: categoryName(l.gearItem.category) },
    }));
    res.json({
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyLoans(req, res, next) {
  try {
    const loans = await prisma.loan.findMany({
      where: { userId: req.profile.id },
      include: {
        gearItem: {
          select: { id: true, name: true, category: { select: { name: true } }, qrCodeUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const normalized = loans.map((l) => ({
      ...l,
      gearItem: { ...l.gearItem, category: categoryName(l.gearItem.category) },
    }));
    res.json(normalized);
  } catch (err) {
    next(err);
  }
}

export async function checkout(req, res, next) {
  try {
    const { gearItemId, durationDays, latitude, longitude, notes } = req.body;

    // Check for overdue loans (outside transaction — read-only check)
    if (await hasOverdueLoans(req.profile.id)) {
      return res.status(403).json({
        error: 'You have overdue items. Please return them before checking out new gear.',
      });
    }

    // Resolve gear ID (shortId → UUID) outside transaction for early 404
    const gearPrecheck = await resolveGear(gearItemId);
    if (!gearPrecheck) {
      return res.status(404).json({ error: 'Gear not found' });
    }

    // Create loan and update gear status in a transaction with row-level lock
    const { loan, gear } = await prisma.$transaction(async (tx) => {
      // Lock the gear row to prevent concurrent checkouts
      const lockedGear = await resolveGearForUpdate(tx, gearItemId);

      if (!lockedGear) {
        throw Object.assign(new Error('Gear not found'), { status: 404 });
      }
      if (lockedGear.loanStatus !== 'AVAILABLE') {
        throw Object.assign(new Error('Gear is not available for checkout'), { status: 409 });
      }

      const dueDate = calculateDueDate(durationDays, lockedGear.defaultLoanDays);

      const newLoan = await tx.loan.create({
        data: {
          gearItemId: lockedGear.id,
          userId: req.profile.id,
          dueDate,
          notes: notes || null,
        },
      });

      await tx.gear.update({
        where: { id: lockedGear.id },
        data: { loanStatus: 'CHECKED_OUT' },
      });

      // Record checkout action with location
      await tx.action.create({
        data: {
          type: 'CHECKOUT',
          userId: req.profile.id,
          gearItemId: lockedGear.id,
          latitude,
          longitude,
        },
      });

      return { loan: newLoan, gear: lockedGear };
    });

    await logAction({
      userId: req.profile.id,
      action: 'CHECKOUT',
      entity: 'Loan',
      entityId: loan.id,
      details: { gearItemId: gear.id, dueDate: loan.dueDate },
    });

    // Send confirmation email (non-blocking)
    sendCheckoutConfirmation({
      email: req.profile.email,
      gearName: gear.name,
      dueDate: loan.dueDate,
    }).catch((err) => logger.error({ err }, 'Checkout email failed'));

    const loanWithGear = await prisma.loan.findUnique({
      where: { id: loan.id },
      include: {
        gearItem: { select: { id: true, name: true, category: { select: { name: true } } } },
      },
    });

    // Normalize category
    loanWithGear.gearItem.category = categoryName(loanWithGear.gearItem.category);
    res.status(201).json(loanWithGear);
  } catch (err) {
    // Surface custom status codes from within the transaction
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

export async function returnGear(req, res, next) {
  try {
    const loanId = req.params.id;
    const { condition, latitude, longitude, notes } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Lock the loan row to prevent concurrent returns
      const [loan] = await tx.$queryRaw(
        Prisma.sql`SELECT * FROM "Loan" WHERE "id" = ${loanId} FOR UPDATE`,
      );

      if (!loan) {
        throw Object.assign(new Error('Loan not found'), { status: 404 });
      }

      if (loan.status !== 'ACTIVE') {
        throw Object.assign(new Error('Loan is not active'), { status: 409 });
      }

      // Members can only return their own loans
      if (req.profile.role !== 'ADMIN' && loan.userId !== req.profile.id) {
        throw Object.assign(new Error('You can only return your own loans'), { status: 403 });
      }

      await tx.loan.update({
        where: { id: loanId },
        data: {
          status: 'RETURNED',
          returnDate: new Date(),
          notes: notes
            ? `${loan.notes ? loan.notes + '\n' : ''}Return: ${notes}${condition ? ` (Condition: ${condition})` : ''}`
            : loan.notes,
        },
      });

      // Lock the gear row before updating its status
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "Gear" WHERE "id" = ${loan.gearItemId} FOR UPDATE`,
      );

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

      return loan;
    });

    // Fetch gear name for the confirmation email
    const gear = await prisma.gear.findUnique({
      where: { id: result.gearItemId },
      select: { name: true },
    });

    await logAction({
      userId: req.profile.id,
      action: 'RETURN',
      entity: 'Loan',
      entityId: loanId,
      details: { gearItemId: result.gearItemId, condition },
    });

    sendReturnConfirmation({
      email: req.profile.email,
      gearName: gear?.name || 'Gear',
    }).catch((err) => logger.error({ err }, 'Return email failed'));

    res.json({ message: 'Gear returned successfully' });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
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

    const loan = await prisma.$transaction(async (tx) => {
      const updated = await tx.loan.update({
        where: { id: loanId },
        data,
        include: { gearItem: true },
      });
      if (status === 'RETURNED') {
        await tx.gear.update({
          where: { id: updated.gearItemId },
          data: { loanStatus: 'AVAILABLE' },
        });
      }
      return updated;
    });

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
