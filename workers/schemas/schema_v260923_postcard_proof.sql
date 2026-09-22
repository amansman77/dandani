-- 엽서를 증명서로 바꾼다.
--
-- 지금까지 엽서에 담긴 건 문장과 방문일수뿐이라, 무엇을 살아냈는지가
-- 들어 있지 않았다. 실천 기록이 생겼으니 그 내용을 엽서에 붙여서
-- "이 말대로 이날 이렇게 했다"가 한 장에 담기게 한다.
--
-- 전부 발행할 때 한 번 쓰고 다시 쓰지 않는 칸이다. 나중에 문장을 바꾸거나
-- 되새김이 더 쌓여도 이 값들은 안 변한다 — 내용이 바뀌는 기록은 증명이
-- 아니다. 바꿀 수 있는 건 preset(배경)뿐이고, 그건 증명이 아니라 표현이다.

ALTER TABLE digital_postcards ADD COLUMN practice_body TEXT;
ALTER TABLE digital_postcards ADD COLUMN practiced_on TEXT;
ALTER TABLE digital_postcards ADD COLUMN nuv_at_issue INTEGER;

-- 발행번호. 사람마다 1번부터 센다 — 남과 견주는 숫자가 아니라
-- "내 몇 번째 증명인가"라서 전역 번호일 이유가 없다.
ALTER TABLE digital_postcards ADD COLUMN issue_no INTEGER;
ALTER TABLE digital_postcards ADD COLUMN issued_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_digital_postcards_issue_no
  ON digital_postcards(user_id, issue_no) WHERE issue_no IS NOT NULL;

-- 기존 엽서 6장은 실천 없이 누브를 주고 산 것들이라 증명이 아니다.
-- 지우면 그 사람 화면에서 물건이 사라지고, 발행번호를 주면 없던 실천을
-- 있다고 하는 셈이 된다. 그래서 번호 없이 그대로 두고, 화면에서만
-- "초기 엽서"로 갈라 보여준다 — practice_record_id가 NULL인 것이 그 표시다.
