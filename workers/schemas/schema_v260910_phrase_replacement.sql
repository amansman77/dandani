-- Apply once after schema_v260910_active_phrase_unique.sql, before Worker deployment.
-- A retirement and its replacement are linked inside one D1 batch transaction.
ALTER TABLE daily_phrases ADD COLUMN replacement_id TEXT;
