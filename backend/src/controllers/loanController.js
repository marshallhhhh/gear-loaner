import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import logger from '../config/logger.js';
import { calculateDueDate } from '../services/loanService.js';
import { sendCheckoutConfirmation, sendReturnConfirmation } from '../services/emailService.js';
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

    // Create loan and update gear status in a single transaction with row-level lock.
    // The overdue-loans check is inside the transaction to save a DB round-trip.
    const { loan, updatedGear } = await prisma.$transaction(async (tx) => {
      // Run overdue check and gear lock concurrently — they touch different rows
      const [overdueCount, lockedGear] = await Promise.all([
        tx.loan.count({
          where: { userId: req.profile.id, status: 'ACTIVE', dueDate: { lt: new Date() } },
        }),
        resolveGearForUpdate(tx, gearItemId),
      ]);

      if (overdueCount > 0) {
        throw Object.assign(
          new Error('You have overdue items. Please return them before checking out new gear.'),
          { status: 403 },
        );
      }

      if (!lockedGear) {
        throw Object.assign(new Error('Gear not found'), { status: 404 });
      }
      if (lockedGear.loanStatus !== 'AVAILABLE') {
        throw Object.assign(new Error('Gear is not available for checkout'), { status: 409 });
      }

      const dueDate = calculateDueDate(durationDays, lockedGear.defaultLoanDays);

      // Create the loan, update gear status, and record the action concurrently
      const [newLoan] = await Promise.all([
        tx.loan.create({
          data: {
            gearItemId: lockedGear.id,
            userId: req.profile.id,
            dueDate,
            notes: notes || null,
          },
        }),
        tx.gear.update({
          where: { id: lockedGear.id },
          data: { loanStatus: 'CHECKED_OUT' },
        }),
        tx.action.create({
          data: {
            type: 'CHECKOUT',
            userId: req.profile.id,
            gearItemId: lockedGear.id,
            latitude,
            longitude,
          },
        }),
      ]);

      // Fetch the updated gear with active loans inside the transaction
      // to avoid an extra round-trip after the transaction commits
      const gearWithLoans = await tx.gear.findUnique({
        where: { id: lockedGear.id },
        include: {
          loans: {
            where: { status: 'ACTIVE' },
            select: { id: true, userId: true, dueDate: true, checkoutDate: true },
          },
          category: { select: { name: true } },
        },
      });

      return { loan: newLoan, updatedGear: gearWithLoans };
    });

    // Fire-and-forget: email (non-blocking, no await)
    sendCheckoutConfirmation({
      email: req.profile.email,
      gearName: updatedGear.name,
      dueDate: loan.dueDate,
    }).catch((err) => logger.error({ err }, 'Checkout email failed'));

    // Redact user IDs from loans for non-admin users
    if (updatedGear.loans) {
      updatedGear.loans = updatedGear.loans.map(({ id, userId, dueDate, checkoutDate }) => ({
        id,
        dueDate,
        checkoutDate,
        isCurrentUserLoan: userId === req.profile.id,
      }));
    }

    // Normalize category
    updatedGear.category = categoryName(updatedGear.category);
    res.status(201).json(updatedGear);
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

    const { result, updatedGear } = await prisma.$transaction(async (tx) => {
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

      // Update loan, gear status, and record action concurrently
      await Promise.all([
        tx.loan.update({
          where: { id: loanId },
          data: {
            status: 'RETURNED',
            returnDate: new Date(),
            notes: notes
              ? `${loan.notes ? loan.notes + '\n' : ''}Return: ${notes}${condition ? ` (Condition: ${condition})` : ''}`
              : loan.notes,
          },
        }),
        tx.gear.update({
          where: { id: loan.gearItemId },
          data: { loanStatus: 'AVAILABLE' },
        }),
        tx.action.create({
          data: {
            type: 'RETURN',
            userId: req.profile.id,
            gearItemId: loan.gearItemId,
            latitude,
            longitude,
          },
        }),
      ]);

      // Fetch updated gear inside the transaction to avoid an extra round-trip
      const gearWithLoans = await tx.gear.findUnique({
        where: { id: loan.gearItemId },
        include: {
          loans: {
            where: { status: 'ACTIVE' },
            select: { id: true, userId: true, dueDate: true, checkoutDate: true },
          },
          category: { select: { name: true } },
        },
      });

      return { result: loan, updatedGear: gearWithLoans };
    });

    // Fire-and-forget: email (non-blocking, no await)
    sendReturnConfirmation({
      email: req.profile.email,
      gearName: updatedGear?.name || 'Gear',
    }).catch((err) => logger.error({ err }, 'Return email failed'));

    // Redact user IDs from loans for non-admin users
    if (updatedGear.loans) {
      updatedGear.loans = updatedGear.loans.map(({ id, userId, dueDate, checkoutDate }) => ({
        id,
        dueDate,
        checkoutDate,
        isCurrentUserLoan: userId === req.profile.id,
      }));
    }

    // Normalize category
    updatedGear.category = categoryName(updatedGear.category);
    res.json(updatedGear);
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

    res.json(loan);
  } catch (err) {
    next(err);
  }
}
