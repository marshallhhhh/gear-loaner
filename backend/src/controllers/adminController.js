import prisma from '../config/prisma.js';
import { stringify } from 'csv-stringify/sync';

export async function exportLoans(req, res, next) {
  try {
    const loans = await prisma.loan.findMany({
      include: {
        gearItem: { select: { name: true, serialNumber: true, category: true } },
        user: { select: { email: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = loans.map((l) => ({
      'Loan ID': l.id,
      'Gear Name': l.gearItem.name,
      'Serial Number': l.gearItem.serialNumber || '',
      Category: l.gearItem.category || '',
      'User Email': l.user.email,
      'User Name': l.user.fullName || '',
      Status: l.status,
      'Checkout Date': l.checkoutDate.toISOString(),
      'Due Date': l.dueDate.toISOString(),
      'Return Date': l.returnDate ? l.returnDate.toISOString() : '',
      Notes: l.notes || '',
    }));

    const csv = stringify(rows, { header: true });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="loans.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

export async function exportGear(req, res, next) {
  try {
    const gear = await prisma.gear.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const rows = gear.map((g) => ({
      ID: g.id,
      Name: g.name,
      Description: g.description || '',
      Category: g.category || '',
      Tags: g.tags.join(', '),
      'Serial Number': g.serialNumber || '',
      Status: g.loanStatus,
      'Default Loan Days': g.defaultLoanDays,
      'Created At': g.createdAt.toISOString(),
    }));

    const csv = stringify(rows, { header: true });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="gear.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

export async function getDashboardStats(req, res, next) {
  try {
    const [totalGear, availableGear, checkedOut, lost, activeLoans, overdueLoans, totalUsers] =
      await Promise.all([
        prisma.gear.count(),
        prisma.gear.count({ where: { loanStatus: 'AVAILABLE' } }),
        prisma.gear.count({ where: { loanStatus: 'CHECKED_OUT' } }),
        prisma.gear.count({ where: { loanStatus: 'LOST' } }),
        prisma.loan.count({ where: { status: 'ACTIVE' } }),
        prisma.loan.count({ where: { status: 'ACTIVE', dueDate: { lt: new Date() } } }),
        prisma.profile.count(),
      ]);

    res.json({
      totalGear,
      availableGear,
      checkedOut,
      lost,
      activeLoans,
      overdueLoans,
      totalUsers,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAuditLog(req, res, next) {
  try {
    const { entity, action, limit } = req.query;
    const where = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10) || 100,
    });

    res.json(logs);
  } catch (err) {
    next(err);
  }
}
