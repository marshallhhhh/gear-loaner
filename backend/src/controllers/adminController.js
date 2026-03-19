import prisma from '../config/prisma.js';
import { stringify } from 'csv-stringify/sync';
import { getGearIdsWithOpenReports, countOpenReports } from '../services/foundReportService.js';
import { categoryName, normalizeGearCategory } from '../services/normalize.js';
import logger from '../config/logger.js';

export async function exportLoans(req, res, next) {
  try {
    const loans = await prisma.loan.findMany({
      include: {
        gearItem: {
          select: { name: true, serialNumber: true, category: { select: { name: true } } },
        },
        user: { select: { email: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = loans.map((l) => ({
      'Loan ID': l.id,
      'Gear Name': l.gearItem.name,
      'Serial Number': l.gearItem.serialNumber || '',
      Category: categoryName(l.gearItem.category, ''),
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
      Category: categoryName(g.category, ''),
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
    const [totalGear, availableGear, checkedOut, lost, activeLoans, overdueLoans, totalUsers, openFoundReports] =
      await Promise.all([
        prisma.gear.count(),
        prisma.gear.count({ where: { loanStatus: 'AVAILABLE' } }),
        prisma.gear.count({ where: { loanStatus: 'CHECKED_OUT' } }),
        prisma.gear.count({ where: { loanStatus: 'LOST' } }),
        prisma.loan.count({ where: { status: 'ACTIVE' } }),
        prisma.loan.count({ where: { status: 'ACTIVE', dueDate: { lt: new Date() } } }),
        prisma.profile.count(),
        countOpenReports(),
      ]);

    res.json({
      totalGear,
      availableGear,
      checkedOut,
      lost,
      openFoundReports,
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
    const { action } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || req.query.limit, 10) || 50, 1), 500);
    const where = {};
    if (action) where.type = action;

    const [actions, total] = await Promise.all([
      prisma.action.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          gearItem: { select: { id: true, name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.action.count({ where }),
    ]);

    res.json({
      data: actions,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
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
        category: { select: { name: true } },
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
        foundReports: {
          include: {
            reporter: { select: { id: true, email: true, fullName: true } },
            closedByAdmin: { select: { id: true, email: true, fullName: true } },
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

    // Helper: format location string
    function formatLoc(lat, lng) {
      return lat != null && lng != null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : '—';
    }

    // Build unified history from Action records
    const actionLabels = {
      CHECKOUT: 'Checkout',
      RETURN: 'Return',
      REPORT_FOUND: 'Reported Found',
      ADMIN_REPORT_LOST: 'Marked Lost',
      ADMIN_MADE_AVAILABLE: 'Marked Available',
      ADMIN_RETIRED: 'Retired',
      ADMIN_UNRETIRED: 'Unretired',
      ADMIN_CANCELLED_LOAN: 'Loan Cancelled',
      ADMIN_MARK_FOUND: 'Marked Found',
    };

    const history = gear.actions.map((action) => ({
      time: action.createdAt,
      user: action.user?.fullName || action.user?.email || 'Anonymous',
      userId: action.userId,
      location: formatLoc(action.latitude, action.longitude),
      action: actionLabels[action.type] || action.type,
      details: action.details || null,
    }));

    // Merge found reports into the unified history timeline
    for (const report of gear.foundReports) {
      history.push({
        time: report.createdAt,
        user: report.reporter?.fullName || report.reporter?.email || 'Anonymous',
        userId: report.reportedBy,
        location: formatLoc(report.latitude, report.longitude),
        action: 'Reported Found',
        details: {
          contactInfo: report.contactInfo,
          notes: report.description,
          reportId: report.id,
          reportStatus: report.status,
        },
      });
    }

    // Sort by time descending
    history.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Normalize category relation to string (legacy frontend shape)
    normalizeGearCategory(gear);

    // Check if there are open found reports for this gear
    const hasOpenReports = gear.foundReports.some((r) => r.status === 'OPEN');

    res.json({
      gear,
      activeLoan,
      history,
      hasOpenReports,
      foundReports: gear.foundReports,
    });
  } catch (err) {
    next(err);
  }
}

export async function closeAllOpenReports(req, res, next) {
  try {
    const gearId = req.params.id;

    const gear = await prisma.gear.findUnique({ where: { id: gearId } });
    if (!gear) {
      return res.status(404).json({ error: 'Gear not found' });
    }

    const result = await prisma.foundReport.updateMany({
      where: { gearItemId: gearId, status: 'OPEN' },
      data: { status: 'CLOSED', closedAt: new Date(), closedBy: req.profile.id },
    });

    if (result.count === 0) {
      return res.status(400).json({ error: 'No open found reports for this item' });
    }

    logger.info({ gearId, adminId: req.profile.id, count: result.count }, 'Admin closed all open found reports for gear');

    res.json({ success: true, closedCount: result.count });
  } catch (err) {
    next(err);
  }
}
