import prisma from '../config/prisma.js';

/**
 * Returns the set of gear IDs whose most recent Action is REPORT_FOUND.
 * Items where a subsequent action (CHECKOUT, RETURN, ADMIN_MADE_AVAILABLE, etc.)
 * occurred are excluded.
 *
 * Uses a single raw query with DISTINCT ON to avoid N+1.
 */
export async function getActiveReportedFoundGearIds() {
  const rows = await prisma.$queryRaw`
    SELECT "gearItemId"
    FROM (
      SELECT DISTINCT ON ("gearItemId") "gearItemId", "type"
      FROM "Action"
      ORDER BY "gearItemId", "createdAt" DESC
    ) latest
    WHERE "type" = 'REPORT_FOUND'
  `;

  return new Set(rows.map((r) => r.gearItemId));
}
