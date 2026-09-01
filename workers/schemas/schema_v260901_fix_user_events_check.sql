-- user_events had a hardcoded SQLite CHECK constraint listing allowed event_type
-- values, separate from the JS-level ALLOWED_EVENT_TYPES array in core.js. The two
-- drifted out of sync: every challenge_upsell_shown / challenge_upsell_declined /
-- challenge_day_logged / phrase_* event silently failed the CHECK constraint and
-- was swallowed by logUserEvent's try/catch, so none of it was ever recorded.
--
-- Drop the DB-level CHECK constraint entirely and rely on the JS-level allowlist
-- as the single source of truth, so this can't drift out of sync again.

CREATE TABLE user_events_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT,
  session_id TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO user_events_new (id, user_id, event_type, event_data, session_id, user_agent, ip_address, created_at)
SELECT id, user_id, event_type, event_data, session_id, user_agent, ip_address, created_at FROM user_events;

DROP TABLE user_events;

ALTER TABLE user_events_new RENAME TO user_events;
