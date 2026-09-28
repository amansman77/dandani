-- 엽서 만들기가 "지금 문장을 엽서로 옮기기"가 되면서(2026-09-28) 버튼 한 번에
-- 엽서가 나온다. 같은 문장으로 같은 날 여러 번 누르면 그날의 엽서 한 장을
-- 돌려주도록, 동시에 두 번 눌러도 한 장만 들어가게 DB가 막는다.
-- 실천 기록에서 나온 엽서(practice_record_id 있음)와 번호 없는 옛 엽서는 대상이 아니다.
CREATE UNIQUE INDEX IF NOT EXISTS idx_digital_postcards_phrase_day
  ON digital_postcards(user_id, phrase_id, practiced_on)
  WHERE practice_record_id IS NULL AND issue_no IS NOT NULL;
