import prisma from '../config/prisma.js';
import { parsePagination } from '../utils/pagination.js';

// Helper: format location string
function formatLoc(lat, lng) {
  return lat != null && lng != null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : '—';
}

export async function createFoundReport(req, res, next) {
  try {
    const { contactInfo, description, latitude, longitude } = req.body;
    const gearId = req.params.id;

    const gear = await prisma.gear.findUnique({ where: { id: gearId } });
    if (!gear) {
      return res.status(404).json({ error: 'Gear not found' });
    }

    const report = await prisma.foundReport.create({
      data: {
        gearItemId: gearId,
        reportedBy: req.profile?.id || null,
        contactInfo: contactInfo || null,
        description: description || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      },
    });

    res.status(201).json({ message: 'Found report submitted. Thank you.', report });
  } catch (err) {
    next(err);
  }
}

export async function listFoundReports(req, res, next) {
  try {
    const { status, gearItemId } = req.query;
    const { page, pageSize, skip, take } = parsePagination(req.query);
    const where = {};

    if (status) where.status = status;
    if (gearItemId) where.gearItemId = gearItemId;

    const [reports, total] = await Promise.all([
      prisma.foundReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          gearItem: { select: { id: true, name: true, shortId: true } },
          reporter: { select: { id: true, email: true, fullName: true } },
          closedByAdmin: { select: { id: true, email: true, fullName: true } },
        },
        skip,
        take,
      }),
      prisma.foundReport.count({ where }),
    ]);

    // Format reports with location information
    const formattedReports = reports.map((report) => ({
      ...report,
      location: formatLoc(report.latitude, report.longitude),
    }));

    res.json({
      data: formattedReports,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    next(err);
  }
}

export async function closeFoundReport(req, res, next) {
  try {
    const reportId = req.params.id;

    const report = await prisma.foundReport.findUnique({ where: { id: reportId } });
    if (!report) {
      return res.status(404).json({ error: 'Found report not found' });
    }
    if (report.status === 'CLOSED') {
      return res.status(400).json({ error: 'Report is already closed' });
    }

    const updated = await prisma.foundReport.update({
      where: { id: reportId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: req.profile.id,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}
