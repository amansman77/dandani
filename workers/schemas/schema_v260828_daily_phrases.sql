CREATE TABLE IF NOT EXISTS daily_phrases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  phrase TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  retired_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_daily_phrases_user_status ON daily_phrases(user_id, status);

CREATE TABLE IF NOT EXISTS daily_phrase_logs (
  id TEXT PRIMARY KEY,
  phrase_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  log_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(phrase_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_phrase_logs_phrase ON daily_phrase_logs(phrase_id);
