/*
  Warnings:

  - You are about to drop the column `category` on the `Gear` table. All the data in the column will be lost.

*/
-- Note: this migration backfills existing category strings into the
-- Category table and wires up the foreign key before dropping the old
-- `category` column to avoid data loss.

-- 1) Add the nullable categoryId column so we can populate it.
ALTER TABLE "Gear" ADD COLUMN "categoryId" TEXT;

-- 2) Ensure distinct category names exist in the Category table.
--    Only insert names not already present.
-- Use gen_random_uuid() to explicitly populate id for each new Category row.
-- This requires the pgcrypto extension (common on managed Postgres/Supabase).
INSERT INTO "Category"("id", "name", "createdAt")
SELECT gen_random_uuid(), t.cat, now()
FROM (
  SELECT DISTINCT "category" AS cat
  FROM "Gear"
  WHERE "category" IS NOT NULL
    AND "category" NOT IN (SELECT "name" FROM "Category")
) t;

-- 3) Populate Gear.categoryId by joining on the Category name.
UPDATE "Gear"
SET "categoryId" = c."id"
FROM "Category" c
WHERE "Gear"."category" IS NOT NULL
  AND c."name" = "Gear"."category";

-- 4) Drop the legacy column now that we've backfilled values.
ALTER TABLE "Gear" DROP COLUMN "category";

-- 5) Add foreign key constraint linking categoryId -> Category.id
ALTER TABLE "Gear" ADD CONSTRAINT "Gear_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
