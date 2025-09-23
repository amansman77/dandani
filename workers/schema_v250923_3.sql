-- practice_feedback 테이블 수정: null 값 허용
-- 기존 테이블을 백업하고 새 구조로 재생성

-- 기존 데이터 백업
CREATE TABLE IF NOT EXISTS practice_feedback_backup AS SELECT * FROM practice_feedback;

-- 기존 테이블 삭제
DROP TABLE IF EXISTS practice_feedback;

-- 새로운 구조로 테이블 재생성 (null 값 허용)
CREATE TABLE practice_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  challenge_id INTEGER NOT NULL,
  practice_day INTEGER NOT NULL,
  mood_change TEXT CHECK (mood_change IN ('improved', 'same', 'worse', 'unknown')),
  was_helpful TEXT CHECK (was_helpful IN ('yes', 'no', 'unknown')),
  practice_description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (challenge_id) REFERENCES challenges(id),
  UNIQUE(user_id, challenge_id, practice_day)
);

-- 기존 데이터 복원 (null 값이 있는 경우 빈 문자열로 변환)
INSERT INTO practice_feedback (user_id, challenge_id, practice_day, mood_change, was_helpful, practice_description, created_at)
SELECT 
  user_id, 
  challenge_id, 
  practice_day, 
  CASE WHEN mood_change = '' THEN NULL ELSE mood_change END,
  CASE WHEN was_helpful = '' THEN NULL ELSE was_helpful END,
  CASE WHEN practice_description = '' THEN NULL ELSE practice_description END,
  created_at
FROM practice_feedback_backup;

-- 백업 테이블 삭제
DROP TABLE IF EXISTS practice_feedback_backup;
