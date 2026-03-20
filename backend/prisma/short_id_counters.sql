-- Schema for prefix-scoped short ID counters
CREATE TABLE IF NOT EXISTS short_id_counters (
  prefix TEXT PRIMARY KEY,
  current_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Atomic counter increment function
CREATE OR REPLACE FUNCTION next_short_id_value(p_prefix TEXT)
RETURNS INTEGER
LANGUAGE SQL
AS $$
  INSERT INTO short_id_counters (prefix, current_value, created_at, updated_at)
  VALUES (UPPER(p_prefix), 1, NOW(), NOW())
  ON CONFLICT (prefix)
  DO UPDATE
    SET current_value = short_id_counters.current_value + 1,
        updated_at = NOW()
  RETURNING current_value;
$$;

-- Example direct query (without function):
-- INSERT INTO short_id_counters (prefix, current_value, created_at, updated_at)
-- VALUES ('ABC', 1, NOW(), NOW())
-- ON CONFLICT (prefix)
-- DO UPDATE
--   SET current_value = short_id_counters.current_value + 1,
--       updated_at = NOW()
-- RETURNING current_value;

-- Pre-production reset option:
-- TRUNCATE TABLE short_id_counters;
