/**
 * One-time backfill script: assigns a shortId to every Gear record that
 * doesn't already have one, and regenerates each QR code so it points to
 * /gear/{shortId} instead of /gear/{uuid}.
 *
 * Run from the backend directory:
 *   node scripts/backfillShortIds.js
 */

import 'dotenv/config';
import prisma from '../src/config/prisma.js';
import { generateShortId } from '../src/services/shortIdService.js';
import { generateAndStoreQRCode } from '../src/services/qrCodeService.js';

async function main() {
  const gear = await prisma.gear.findMany({
    select: { id: true, name: true, category: { select: { name: true } }, shortId: true },
  });

  const toBackfill = gear.filter((g) => !g.shortId);
  console.log(`Found ${toBackfill.length} gear item(s) without a shortId.`);

  if (toBackfill.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  // Collect all existing shortIds up-front so we don't generate duplicates
  // within this batch (generateShortId fetches from DB, but we pass them in
  // to avoid N+1 queries).
  const existingIds = gear.map((g) => g.shortId).filter(Boolean);

  for (const item of toBackfill) {
    // Generate shortId, passing accumulated list so we avoid duplicates
  const shortId = await generateShortId(item.name, item.category?.name, existingIds);
    existingIds.push(shortId); // track for subsequent iterations

    // Regenerate QR code pointing to /gear/{shortId}
    let qrCodeUrl;
    try {
      qrCodeUrl = await generateAndStoreQRCode(item.id, shortId);
    } catch (err) {
      console.warn(`  ⚠️  QR generation failed for ${item.id}: ${err.message}`);
    }

    await prisma.gear.update({
      where: { id: item.id },
      data: {
        shortId,
        ...(qrCodeUrl ? { qrCodeUrl } : {}),
      },
    });

    console.log(`  ✅  ${item.name} → ${shortId}${qrCodeUrl ? '' : ' (QR skipped)'}`);
  }

  console.log('Backfill complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
