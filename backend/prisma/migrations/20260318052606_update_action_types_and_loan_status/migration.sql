/*
  Warnings:

  - The values [REPORTED_FOUND,STATUS_CHANGE] on the enum `ActionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;

-- First, change column to text so we can manipulate values freely
ALTER TABLE "Action" ALTER COLUMN "type" TYPE TEXT;

-- Migrate existing data: map old ActionType values to new ones
UPDATE "Action" SET "type" = 'REPORTED_FOUND' WHERE "type" = 'REPORTED_FOUND';
UPDATE "Action" SET "type" = 'ADMIN_MARKED_FOUND' WHERE "type" = 'STATUS_CHANGE';

-- Drop old enum and create new one
DROP TYPE "ActionType";
CREATE TYPE "ActionType" AS ENUM ('CHECKOUT', 'RETURN', 'ADMIN_MARKED_LOST', 'ADMIN_MARKED_FOUND', 'ADMIN_RETURN', 'RETIRED', 'UNRETIRED', 'REPORTED_FOUND');

-- Cast text column back to enum
ALTER TABLE "Action" ALTER COLUMN "type" TYPE "ActionType" USING ("type"::"ActionType");

COMMIT;

-- AlterEnum
ALTER TYPE "LoanStatus" ADD VALUE 'CANCELLED';
