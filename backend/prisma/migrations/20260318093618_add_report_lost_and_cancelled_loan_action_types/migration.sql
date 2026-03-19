/*
  Warnings:

  - The values [ADMIN_MARKED_LOST,ADMIN_MARKED_FOUND,ADMIN_RETURN,RETIRED,UNRETIRED,REPORTED_FOUND] on the enum `ActionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActionType_new" AS ENUM ('CHECKOUT', 'RETURN', 'REPORT_LOST', 'REPORT_FOUND', 'ADMIN_REPORT_LOST', 'ADMIN_MADE_AVAILABLE', 'ADMIN_RETIRED', 'ADMIN_UNRETIRED', 'ADMIN_CANCELLED_LOAN');
ALTER TABLE "Action" ALTER COLUMN "type" TYPE "ActionType_new" USING ("type"::text::"ActionType_new");
ALTER TYPE "ActionType" RENAME TO "ActionType_old";
ALTER TYPE "ActionType_new" RENAME TO "ActionType";
DROP TYPE "public"."ActionType_old";
COMMIT;

-- DropTable
DROP TABLE "AuditLog";
