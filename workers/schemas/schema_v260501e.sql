CREATE TABLE IF NOT EXISTS identity_dandanis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anonymous_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  dominant_action TEXT NOT NULL DEFAULT 'START',
  emotion_pattern TEXT,
  slot_index INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
