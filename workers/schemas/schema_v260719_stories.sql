-- ADR-PROD-011 Story Feed Platform
-- Story: 하나의 삶의 이야기 + 하나의 작은 실천(Story Challenge)
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  author_type TEXT NOT NULL CHECK (author_type IN ('ai', 'user')),
  author_id TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  practice_title TEXT NOT NULL,
  practice_description TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stories_status_created ON stories(status, created_at);

-- 사용자가 특정 Story의 실천을 "나도 해보기"한 기록
CREATE TABLE IF NOT EXISTS story_tries (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  note TEXT,
  tried_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (story_id) REFERENCES stories(id)
);

CREATE INDEX IF NOT EXISTS idx_story_tries_story ON story_tries(story_id);
CREATE INDEX IF NOT EXISTS idx_story_tries_user ON story_tries(user_id);
