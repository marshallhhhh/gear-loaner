-- AlterEnum
ALTER TYPE "ActionType" ADD VALUE 'STATUS_CHANGE';

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "Gear_loanStatus_idx" ON "Gear"("loanStatus");

-- CreateIndex
CREATE INDEX "Gear_categoryId_idx" ON "Gear"("categoryId");
