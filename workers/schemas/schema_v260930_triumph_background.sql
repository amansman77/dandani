-- 배경 "이겨낸 아침"(triumph)을 저장할 수 있게 preset의 허용 목록을 넓힌다
-- (2026-09-30). 작심삼일 극복 엽서의 전용 배경이었다가, 작심삼일을 한 번이라도
-- 이겨낸 사람에게는 일반 엽서에서도 열리게 했다. 누가 고를 수 있는지는 서버
-- (savePostcard)가 정하고, 여기서는 값만 허용한다.
--
-- SQLite는 CHECK를 고칠 수 없어서 테이블을 새로 만들어 옮긴다. 다른 테이블이
-- digital_postcards를 참조하지 않는 것(FK 없음)을 2026-09-30 확인했다. 열·기본값·
-- 제약은 적용 직전 프로덕션 정의 그대로이고 preset CHECK만 다르다.

CREATE TABLE digital_postcards_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  phrase_id TEXT NOT NULL,
  phrase TEXT NOT NULL,
  visit_days INTEGER NOT NULL DEFAULT 1 CHECK (visit_days >= 1),
  preset TEXT NOT NULL DEFAULT 'morning'
    CHECK (preset IN ('morning', 'dawn', 'paper', 'light', 'triumph')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'saved')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  saved_at TEXT,
  practice_record_id TEXT,
  practice_body TEXT,
  practiced_on TEXT,
  nuv_at_issue INTEGER,
  issue_no INTEGER,
  issued_at TEXT,
  logged_days_at_issue INTEGER,
  kind TEXT NOT NULL DEFAULT 'regular' CHECK (kind IN ('regular', 'beat_three_days'))
);

INSERT INTO digital_postcards_new
  (id, user_id, phrase_id, phrase, visit_days, preset, status, created_at, saved_at,
   practice_record_id, practice_body, practiced_on, nuv_at_issue, issue_no, issued_at,
   logged_days_at_issue, kind)
SELECT id, user_id, phrase_id, phrase, visit_days, preset, status, created_at, saved_at,
   practice_record_id, practice_body, practiced_on, nuv_at_issue, issue_no, issued_at,
   logged_days_at_issue, kind
FROM digital_postcards;

DROP TABLE digital_postcards;
ALTER TABLE digital_postcards_new RENAME TO digital_postcards;

CREATE INDEX idx_digital_postcards_user_status_created
  ON digital_postcards(user_id, status, created_at DESC);
CREATE UNIQUE INDEX idx_digital_postcards_practice_record
  ON digital_postcards(practice_record_id) WHERE practice_record_id IS NOT NULL;
CREATE UNIQUE INDEX idx_digital_postcards_issue_no
  ON digital_postcards(user_id, issue_no) WHERE issue_no IS NOT NULL;
CREATE UNIQUE INDEX idx_digital_postcards_phrase_day
  ON digital_postcards(user_id, phrase_id, practiced_on)
  WHERE practice_record_id IS NULL AND issue_no IS NOT NULL AND kind = 'regular';
CREATE UNIQUE INDEX idx_digital_postcards_beat_three_days
  ON digital_postcards(user_id, phrase_id)
  WHERE kind = 'beat_three_days';

-- 이제 저장할 수 있으니, 이미 나간 작심삼일 극복 엽서의 preset도 사실대로 적는다.
UPDATE digital_postcards SET preset = 'triumph' WHERE kind = 'beat_three_days';
