import prisma from '../config/prisma.js';
import { stringify } from 'csv-stringify/sync';

export async function exportLoans(req, res, next) {
  try {
    const loans = await prisma.loan.findMany({
      include: {
        gearItem: { select: { name: true, serialNumber: true, category: { select: { name: true } } } },
        user: { select: { email: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = loans.map((l) => ({
      'Loan ID': l.id,
      'Gear Name': l.gearItem.name,
      'Serial Number': l.gearItem.serialNumber || '',
      Category: l.gearItem.category?.name || '',
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
      include: { category: { select: { name: true } } },
    });

    const rows = gear.map((g) => ({
      ID: g.id,
      Name: g.name,
      Description: g.description || '',
      Category: g.category?.name || '',
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

export async function getAdminGearDetail(req, res, next) {
  try {
    const gearId = req.params.id;

    const gear = await prisma.gear.findUnique({
      where: { id: gearId },
      include: {
        loans: {
          include: {
            user: { select: { id: true, email: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        actions: {
          include: {
            user: { select: { id: true, email: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!gear) {
      return res.status(404).json({ error: 'Gear not found' });
    }

    // Current active loan
    const activeLoan = gear.loans.find((l) => l.status === 'ACTIVE') || null;

    // Audit logs for this gear item (for admin-level edits, etc.)
    const auditLogs = await prisma.auditLog.findMany({
      where: { entity: 'Gear', entityId: gearId },
      orderBy: { createdAt: 'desc' },
    });

    // Loan-level audit logs (OVERRIDE, etc.)
    const loanIds = gear.loans.map((l) => l.id);
    const loanAuditLogs = loanIds.length
      ? await prisma.auditLog.findMany({
          where: { entity: 'Loan', entityId: { in: loanIds } },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    // Resolve user info for audit log userIds
    const auditUserIds = [
      ...new Set(
        [...auditLogs, ...loanAuditLogs].map((l) => l.userId).filter(Boolean)
      ),
    ];
    const auditUsers = auditUserIds.length
      ? await prisma.profile.findMany({
          where: { id: { in: auditUserIds } },
          select: { id: true, email: true, fullName: true },
        })
      : [];
    const userMap = Object.fromEntries(auditUsers.map((u) => [u.id, u]));

    // Helper: format location string
    function formatLoc(lat, lng) {
      return lat != null && lng != null
        ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        : '—';
    }

    // Build unified history from Action records
    const history = [];

    const actionLabels = {
      CHECKOUT: 'Checkout',
      RETURN: 'Return',
      REPORT_LOST: 'Reported Lost',
    };

    for (const action of gear.actions) {
      history.push({
        time: action.createdAt,
        user: action.user?.fullName || action.user?.email || 'Anonymous',
        userId: action.userId,
        location: formatLoc(action.latitude, action.longitude),
        action: actionLabels[action.type] || action.type,
      });
    }

    // Audit logs (gear-level: UPDATE, DELETE, etc.)
    for (const log of auditLogs) {
      const u = log.userId ? userMap[log.userId] : null;
      // Skip CREATE and REPORT_LOST — CREATE is redundant, REPORT_LOST is already in actions
      if (log.action === 'CREATE' || log.action === 'REPORT_LOST') continue;
      history.push({
        time: log.createdAt,
        user: u?.fullName || u?.email || 'System',
        userId: log.userId,
        location: '—',
        action: log.action,
      });
    }

    // Loan-level audit logs (only actions not already covered by Action model)
    for (const log of loanAuditLogs) {
      // CHECKOUT and RETURN are now in the Action model
      if (['CHECKOUT', 'RETURN'].includes(log.action)) continue;
      const u = log.userId ? userMap[log.userId] : null;
      history.push({
        time: log.createdAt,
        user: u?.fullName || u?.email || 'System',
        userId: log.userId,
        location: '—',
        action: log.action,
      });
    }

    // Sort by time descending
    history.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({
      gear,
      activeLoan,
      history,
    });
  } catch (err) {
    next(err);
  }
}
