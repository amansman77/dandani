-- 작심삼일을 이겨낸 엽서(2026-09-30). 같은 문장을 3일 연속 되새긴 사람이 발행할
-- 수 있는 특별한 엽서다. 광고 카피 "작심 3일을 이겨내봐요. 작심 3일을 이겨낸 특별한
-- 엽서를 발행할 수 있어요"를 앱에서 참말로 만드는 기능.
--
-- kind
--   regular          엽서 만들기로 나온 일반 엽서(기존 엽서 전부)
--   beat_three_days  작심삼일을 이겨낸 엽서 — 문장마다 한 장

ALTER TABLE digital_postcards ADD COLUMN kind TEXT NOT NULL DEFAULT 'regular'
  CHECK (kind IN ('regular', 'beat_three_days'));

-- "같은 문장·같은 날 한 장"은 일반 엽서에만 적용한다. 작심삼일 엽서는 이겨낸
-- 날 일반 엽서와 같은 날 나올 수 있어서, 두 규칙이 서로 막으면 안 된다.
DROP INDEX IF EXISTS idx_digital_postcards_phrase_day;
CREATE UNIQUE INDEX IF NOT EXISTS idx_digital_postcards_phrase_day
  ON digital_postcards(user_id, phrase_id, practiced_on)
  WHERE practice_record_id IS NULL AND issue_no IS NOT NULL AND kind = 'regular';

CREATE UNIQUE INDEX IF NOT EXISTS idx_digital_postcards_beat_three_days
  ON digital_postcards(user_id, phrase_id)
  WHERE kind = 'beat_three_days';
