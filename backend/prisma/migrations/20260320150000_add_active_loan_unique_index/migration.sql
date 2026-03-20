-- Enforce at the database level that only one ACTIVE loan can exist per gear item.
-- This partial unique index acts as a hard invariant that application-level locking alone cannot guarantee.
CREATE UNIQUE INDEX "loan_one_active_per_gear_idx"
  ON "Loan" ("gearItemId")
  WHERE (status = 'ACTIVE');
