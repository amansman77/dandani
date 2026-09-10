-- Run preflight_v260910_active_phrases.sql before applying this migration.
-- Existing duplicates cause failure; no phrase or log is deleted or retired.
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_phrases_one_active_per_user
ON daily_phrases(user_id) WHERE status = 'active';
