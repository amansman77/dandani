CREATE TABLE IF NOT EXISTS digital_postcards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  phrase_id TEXT NOT NULL,
  phrase TEXT NOT NULL,
  visit_days INTEGER NOT NULL DEFAULT 1 CHECK (visit_days >= 1),
  preset TEXT NOT NULL DEFAULT 'morning' CHECK (preset IN ('morning', 'dawn', 'paper', 'light')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'saved')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  saved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_digital_postcards_user_status_created
  ON digital_postcards(user_id, status, created_at DESC);
