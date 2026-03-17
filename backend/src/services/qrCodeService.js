import QRCode from 'qrcode';
import { supabaseAdmin } from '../config/supabase.js';

const APP_URL = process.env.APP_URL || 'https://tasuniclimbing.club';
const BUCKET_NAME = 'qr-codes';

/**
 * Generates a QR code PNG for a gear item and uploads it to Supabase Storage.
 * Returns the public URL of the QR code image.
 *
 * @param {string} gearId  - UUID used as the storage file key
 * @param {string} shortId - Short identifier used as the QR scan target (AAA-XXX).
 *                           Falls back to gearId if not provided (legacy behaviour).
 */
export async function generateAndStoreQRCode(gearId, shortId) {
  const target = shortId ?? gearId;
  const qrContent = `${APP_URL}/gear/${target}`;

  const qrBuffer = await QRCode.toBuffer(qrContent, {
    type: 'png',
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const filePath = `${gearId}.png`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(filePath, qrBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload QR code: ${uploadError.message}`);
  }

  const { data } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Generates a QR code as a data URL (for inline display without storage).
 *
 * @param {string} gearId  - UUID (fallback target if shortId not provided)
 * @param {string} shortId - Short identifier (preferred QR target)
 */
export async function generateQRCodeDataUrl(gearId, shortId) {
  const target = shortId ?? gearId;
  const qrContent = `${APP_URL}/gear/${target}`;
  return QRCode.toDataURL(qrContent, {
    width: 300,
    margin: 2,
  });
}
