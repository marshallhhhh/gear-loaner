import QRCode from 'qrcode';
import { supabaseAdmin } from '../config/supabase.js';

const APP_URL = process.env.APP_URL || 'https://tasuniclimbing.club';
const BUCKET_NAME = 'qr-codes';

/**
 * Generates a QR code PNG for a gear item and uploads it to Supabase Storage.
 * Returns the public URL of the QR code image.
 */
export async function generateAndStoreQRCode(gearId) {
  const qrContent = `${APP_URL}/gear/${gearId}`;

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

  const { data } = supabaseAdmin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Generates a QR code as a data URL (for inline display without storage).
 */
export async function generateQRCodeDataUrl(gearId) {
  const qrContent = `${APP_URL}/gear/${gearId}`;
  return QRCode.toDataURL(qrContent, {
    width: 300,
    margin: 2,
  });
}
