import { nanoid } from 'nanoid';
import prisma from '../config/prisma.js';

const NANOID_LENGTH = 6;
const MAX_COLLISION_RETRIES = 10;

/**
 * Generate a unique 6-character nanoid, retrying on collision.
 */
async function generateUniqueNanoid() {
  for (let i = 0; i < MAX_COLLISION_RETRIES; i++) {
    const id = nanoid(NANOID_LENGTH);
    const existing = await prisma.qrTag.findUnique({ where: { nanoid: id } });
    if (!existing) return id;
  }
  throw new Error('Failed to generate unique nanoid after retries');
}

/**
 * Find a QR tag by its nanoid, optionally including the linked gear item.
 */
export async function findByNanoid(nanoid) {
  return prisma.qrTag.findUnique({
    where: { nanoid },
    include: {
      gearItem: {
        include: {
          category: true,
          loans: {
            where: { status: 'ACTIVE' },
            select: { id: true, userId: true, dueDate: true },
          },
        },
      },
    },
  });
}

/**
 * Create a new QR tag with an auto-generated nanoid.
 */
export async function createQrTag() {
  const id = await generateUniqueNanoid();
  return prisma.qrTag.create({ data: { nanoid: id } });
}

/**
 * Create a QR tag with a specific nanoid (e.g. scanned from a physical tag).
 * Returns the existing tag if the nanoid already exists.
 */
export async function findOrCreateByNanoid(nanoid) {
  const existing = await prisma.qrTag.findUnique({
    where: { nanoid },
    include: { gearItem: true },
  });
  if (existing) return { qrTag: existing, created: false };

  const qrTag = await prisma.qrTag.create({ data: { nanoid } });
  return { qrTag, created: true };
}

/**
 * Assign a gear item to a QR tag. Enforces one-to-one within a transaction.
 */
export async function assignGearItem(nanoid, gearItemId) {
  return prisma.$transaction(async (tx) => {
    const qrTag = await tx.qrTag.findUnique({ where: { nanoid } });
    if (!qrTag) throw Object.assign(new Error('QR tag not found'), { status: 404 });

    if (qrTag.gearItemId) {
      throw Object.assign(new Error('This QR tag already assigned to an item'), { status: 409 });
    }

    // Verify gear item exists
    const gear = await tx.gear.findUnique({ where: { id: gearItemId } });
    if (!gear) throw Object.assign(new Error('Gear item not found'), { status: 404 });

    // Check if gear already has a QR tag
    const existingTag = await tx.qrTag.findUnique({ where: { gearItemId } });
    if (existingTag) {
      throw Object.assign(new Error('Gear item already has a QR tag assigned'), { status: 409 });
    }

    return tx.qrTag.update({
      where: { nanoid },
      data: { gearItemId },
      include: { gearItem: true },
    });
  });
}

/**
 * Remove the gear item association from a QR tag.
 */
export async function unassignGearItem(nanoid) {
  return prisma.$transaction(async (tx) => {
    const qrTag = await tx.qrTag.findUnique({ where: { nanoid } });
    if (!qrTag) throw Object.assign(new Error('QR tag not found'), { status: 404 });

    if (!qrTag.gearItemId) {
      throw Object.assign(new Error('QR tag is not assigned to any gear item'), { status: 400 });
    }

    return tx.qrTag.update({
      where: { nanoid },
      data: { gearItemId: null },
    });
  });
}
