import prisma from '../config/prisma.js';

const MAX_LOAN_DAYS = 30;

/**
 * Check if a user has any overdue active loans.
 */
export async function hasOverdueLoans(userId) {
  const count = await prisma.loan.count({
    where: {
      userId,
      status: 'ACTIVE',
      dueDate: { lt: new Date() },
    },
  });
  return count > 0;
}

/**
 * Validate and clamp the requested loan duration.
 * Returns the due date.
 */
export function calculateDueDate(requestedDays, defaultDays) {
  const days = Math.max(1, Math.min(requestedDays || defaultDays || 7, MAX_LOAN_DAYS));
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate;
}

/**
 * Get overdue loans with user and gear info (for notification jobs).
 */
export async function getOverdueLoans() {
  return prisma.loan.findMany({
    where: {
      status: 'ACTIVE',
      dueDate: { lt: new Date() },
    },
    include: {
      user: true,
      gearItem: true,
    },
  });
}
