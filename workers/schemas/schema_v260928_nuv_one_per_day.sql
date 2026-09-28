-- 누브 1개는 "하루 되새겼다"는 뜻이다. 원장 키가 `문장ID:날짜`였을 때는 같은
-- 날 문장을 새로 바꾸면(replace) 키가 달라져 누브가 한 번 더 나왔다. 누브는
-- 나중에 체인에 새길 자산이라 원장이 사실이어야 해서, 키를 날짜만으로 줄여
-- 기존 UNIQUE(user_id, reason, reference_id)가 사람당 하루 1개를 지키게 한다.
--
-- 적용 직전 프로덕션 원장(2026-09-28)은 10건·2명, 같은 날 두 번 받은 경우는
-- 없었다. 만약 생겼다면 이 UPDATE는 UNIQUE 위반으로 실패한다 — 조용히 하나를
-- 지우지 않고 사람이 보고 판단하게 두려는 것이다.

UPDATE nuv_transactions
SET reference_id = substr(reference_id, instr(reference_id, ':') + 1)
WHERE reason = 'daily_reflection' AND instr(reference_id, ':') > 0;
