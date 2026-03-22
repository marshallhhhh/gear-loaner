-- Drop stored QR code URL column; QR codes are now generated dynamically on the frontend.
ALTER TABLE "Gear" DROP COLUMN IF EXISTS "qrCodeUrl";
