-- 실천 기록 — "이 말대로 살았다"를 적는 자리.
--
-- 되새김(daily_phrase_logs)은 두드리기라서 하루 한 번, 내용이 없다. 실천은
-- 쓰기라서 본문이 있고, 하루에 여러 번 있을 수도 있고, 아예 없는 날이 대부분이다.
-- 성격이 이렇게 다른데 한 테이블에 섞으면 둘의 무게가 같아져서 따로 둔다.
--
-- 엽서(digital_postcards)와도 따로 둔다. 기록은 문턱(10누브) 전에도 쌓이고,
-- 엽서는 그중 발행된 것이다. 한 테이블로 합치면 "아직 엽서가 아닌 엽서"라는
-- 이상한 상태가 생긴다.

CREATE TABLE IF NOT EXISTS practice_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  phrase_id TEXT NOT NULL,

  -- 그때 그 말이어야 증명이 된다. 문장을 나중에 바꿔도 이 기록 속 문장은
  -- 안 변하도록 적을 때 통째로 복사해 굳힌다. daily_phrases를 조인해 읽으면
  -- 문장을 교체한 뒤 기록의 내용이 바뀌어버린다.
  phrase TEXT NOT NULL,

  -- 실천이 있었던 날. 오늘로 채우되 고칠 수 있다 — 그저께 있었던 일을
  -- 오늘 생각나서 쓸 수도 있고, 실천은 일정표대로 오지 않는다.
  practiced_on TEXT NOT NULL,

  -- 본문. 길이는 재지 않는다(한 줄이어도 된다). 다만 빈 기록은 증명이 될 수
  -- 없어서 그것만 막는다.
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),

  -- 적은 시점까지 쌓인 누브. 엽서에 찍히는 숫자이고, 나중에 되새김이 더
  -- 쌓여도 이 숫자는 안 변한다 — "이때까지 이만큼 되새기고 살아냈다"는 뜻이라
  -- 그 시점에 굳어야 한다.
  nuv_at_record INTEGER NOT NULL DEFAULT 0 CHECK (nuv_at_record >= 0),

  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 오늘 화면의 "이 말대로 산 날 N번"과 기록 목록이 둘 다 이 인덱스로 간다.
CREATE INDEX IF NOT EXISTS idx_practice_records_user_phrase
  ON practice_records(user_id, phrase_id, practiced_on DESC);

-- 엽서는 기록에서 발행된다. 기록 하나에 엽서는 최대 하나.
-- 아직 문턱을 못 넘어 발행되지 않은 기록은 여기에 행이 없다.
ALTER TABLE digital_postcards ADD COLUMN practice_record_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_digital_postcards_practice_record
  ON digital_postcards(practice_record_id) WHERE practice_record_id IS NOT NULL;
