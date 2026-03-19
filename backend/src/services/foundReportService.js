import prisma from '../config/prisma.js';

/**
 * Returns the set of gear IDs that have at least one OPEN FoundReport.
 */
export async function getGearIdsWithOpenReports() {
  const rows = await prisma.foundReport.findMany({
    where: { status: 'OPEN' },
    select: { gearItemId: true },
    distinct: ['gearItemId'],
  });
  return new Set(rows.map((r) => r.gearItemId));
}

/**
 * Count open found reports (for dashboard stats).
 */
export async function countOpenReports() {
  return prisma.foundReport.count({ where: { status: 'OPEN' } });
}
