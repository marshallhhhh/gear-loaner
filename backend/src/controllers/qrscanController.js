import prisma from '../config/prisma.js';

export async function recordScan(req, res, next) {
  try {
    const { gearItemId, latitude, longitude } = req.body;

    if (!gearItemId) {
      return res.status(400).json({ error: 'gearItemId is required' });
    }

    const gear = await prisma.gear.findUnique({ where: { id: gearItemId } });
    if (!gear) {
      return res.status(404).json({ error: 'Gear not found' });
    }

    const scan = await prisma.qRScan.create({
      data: {
        userId: req.profile?.id || null,
        gearItemId,
        latitude: latitude || null,
        longitude: longitude || null,
        ipAddress: req.ip,
      },
    });

    res.status(201).json(scan);
  } catch (err) {
    next(err);
  }
}

export async function listScans(req, res, next) {
  try {
    const { gearItemId, userId } = req.query;
    const where = {};
    if (gearItemId) where.gearItemId = gearItemId;
    if (userId) where.userId = userId;

    const scans = await prisma.qRScan.findMany({
      where,
      include: {
        gearItem: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json(scans);
  } catch (err) {
    next(err);
  }
}
