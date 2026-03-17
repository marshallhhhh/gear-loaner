-- DropForeignKey
ALTER TABLE "Action" DROP CONSTRAINT "Action_gearItemId_fkey";

-- DropForeignKey
ALTER TABLE "Loan" DROP CONSTRAINT "Loan_gearItemId_fkey";

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_gearItemId_fkey" FOREIGN KEY ("gearItemId") REFERENCES "Gear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_gearItemId_fkey" FOREIGN KEY ("gearItemId") REFERENCES "Gear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
