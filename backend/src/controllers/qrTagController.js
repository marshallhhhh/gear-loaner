import prisma from '../config/prisma.js';
import { parsePagination } from '../utils/pagination.js';
import * as qrTagService from '../services/qrTagService.js';

/**
 * GET /qr-tags/:nanoid
 * Public with optional auth. Returns tag + gear info if linked.
 * Admins see extra info when tag is unlinked.
 */
export async function getQrTag(req, res) {
  const { nanoid } = req.params;
  const isAdmin = req.profile?.role === 'ADMIN';

  const qrTag = await qrTagService.findByNanoid(nanoid);

  if (!qrTag) {
    if (!isAdmin) {
      return res.status(404).json({ error: 'Not found' });
    }
    // Admin: auto-create the tag
    const created = await qrTagService.findOrCreateByNanoid(nanoid);
    return res.json({ qrTag: created.qrTag, linked: false, created: true });
  }

  if (qrTag.gearItemId && qrTag.gearItem) {
    // Linked — return gear data (hide borrower details for non-admins)
    const gear = { ...qrTag.gearItem };
    gear.category = gear.category?.name || null;
    delete gear.categoryId;

    if (!isAdmin && gear.loans) {
      gear.loans = gear.loans.map((l) => ({
        id: l.id,
        isCurrentUserLoan: l.userId === req.profile?.id,
        dueDate: l.dueDate,
      }));
    }

    return res.json({ qrTag: { id: qrTag.id, nanoid: qrTag.nanoid }, linked: true, gear });
  }

  // Unlinked
  if (!isAdmin) {
    return res.status(404).json({ error: 'Not found' });
  }

  return res.json({ qrTag: { id: qrTag.id, nanoid: qrTag.nanoid }, linked: false });
}

/**
 * POST /qr-tags
 * Admin only. Creates a new QR tag with auto-generated nanoid.
 */
export async function createQrTagHandler(req, res) {
  const qrTag = await qrTagService.createQrTag();
  res.status(201).json(qrTag);
}

/**
 * POST /qr-tags/:nanoid/assign
 * Admin only. Assigns a gear item to the QR tag.
 */
export async function assignQrTag(req, res) {
  const { nanoid } = req.params;
  const { gearItemId } = req.body;

  const qrTag = await qrTagService.assignGearItem(nanoid, gearItemId);
  res.json(qrTag);
}

/**
 * POST /qr-tags/:nanoid/unassign
 * Admin only. Removes the gear item from the QR tag.
 */
export async function unassignQrTag(req, res) {
  const { nanoid } = req.params;

  const qrTag = await qrTagService.unassignGearItem(nanoid);
  res.json(qrTag);
}

/**
 * GET /qr-tags/untagged-gear
 * Admin only. Lists gear items that do NOT have a QR tag, with pagination and search.
 */
export async function listUntaggedGear(req, res) {
  const { page, pageSize, skip, take } = parsePagination(req.query);
  const { search } = req.query;

  const where = {
    qrTag: { is: null },
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { shortId: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.gear.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: { category: true },
    }),
    prisma.gear.count({ where }),
  ]);

  const items = data.map((g) => ({
    ...g,
    category: g.category?.name || null,
    categoryId: undefined,
  }));

  res.json({
    data: items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
