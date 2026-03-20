-- Add index to speed up overdue loan lookups by due date.
CREATE INDEX IF NOT EXISTS "Loan_dueDate_idx" ON "Loan"("dueDate");
