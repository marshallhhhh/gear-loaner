CREATE TABLE IF NOT EXISTS short_id_counters (
  prefix TEXT PRIMARY KEY,
  current_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Atomic upsert to reserve next sequence number for a prefix.
-- Example usage:
-- INSERT INTO short_id_counters (prefix, current_value, created_at, updated_at)
-- VALUES ('ABC', 1, NOW(), NOW())
-- ON CONFLICT (prefix)
-- DO UPDATE
--   SET current_value = short_id_counters.current_value + 1,
--       updated_at = NOW()
-- RETURNING current_value;
