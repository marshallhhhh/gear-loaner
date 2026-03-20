/*
  Warnings:

  - The values [REPORT_LOST] on the enum `ActionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "FoundReportStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterEnum
BEGIN;
CREATE TYPE "ActionType_new" AS ENUM ('CHECKOUT', 'RETURN', 'REPORT_FOUND', 'ADMIN_REPORT_LOST', 'ADMIN_MADE_AVAILABLE', 'ADMIN_RETIRED', 'ADMIN_UNRETIRED', 'ADMIN_CANCELLED_LOAN', 'ADMIN_MARK_FOUND');
ALTER TABLE "Action" ALTER COLUMN "type" TYPE "ActionType_new" USING ("type"::text::"ActionType_new");
ALTER TYPE "ActionType" RENAME TO "ActionType_old";
ALTER TYPE "ActionType_new" RENAME TO "ActionType";
DROP TYPE "public"."ActionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "short_id_counters" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FoundReport" (
    "id" TEXT NOT NULL,
    "gearItemId" TEXT NOT NULL,
    "reportedBy" TEXT,
    "contactInfo" TEXT,
    "description" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "FoundReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,

    CONSTRAINT "FoundReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FoundReport_gearItemId_idx" ON "FoundReport"("gearItemId");

-- CreateIndex
CREATE INDEX "FoundReport_status_idx" ON "FoundReport"("status");

-- AddForeignKey
ALTER TABLE "FoundReport" ADD CONSTRAINT "FoundReport_gearItemId_fkey" FOREIGN KEY ("gearItemId") REFERENCES "Gear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoundReport" ADD CONSTRAINT "FoundReport_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoundReport" ADD CONSTRAINT "FoundReport_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
