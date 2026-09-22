-- 누브를 재화에서 기록으로 되돌린다.
--
-- 누브 1개는 "이 문장을 하루 되새겼다"는 뜻이다. 그러면 두 가지가 원장에
-- 남아 있으면 안 된다.
--
--   welcome_grant     가입만 한 사람에게 10누브 — 살지 않은 열흘
--   postcard_creation 엽서를 만들 때 -10누브 — 살아낸 날이 줄어듦
--
-- 적용 직전 프로덕션 원장은 이랬다. 선물 210누브(21명), 엽서로 빠진 -80누브,
-- 되새김으로 실제로 번 누브는 4누브(2명). 존재하는 누브의 98%가 살아낸 적
-- 없는 누브였고, 발행된 엽서 전부가 그 선물로 산 것이었다. 나중에 온체인으로
-- 발행할 자산이라면 지금 원장이 사실이어야 해서, 이미 나간 것도 되돌린다.
--
-- 지운 뒤 남는 건 daily_reflection뿐이라 잔액은 곧 되새긴 날의 수가 된다.

DELETE FROM nuv_transactions WHERE reason IN ('welcome_grant', 'postcard_creation');

-- 지갑 잔액은 INSERT 트리거로만 갱신된다. DELETE에는 트리거가 없으니 원장에서
-- 다시 계산해 맞춘다. 거래가 하나도 없는 사람은 0이 된다.
UPDATE nuv_wallets
SET balance = COALESCE(
      (SELECT SUM(amount) FROM nuv_transactions t WHERE t.user_id = nuv_wallets.user_id),
      0
    ),
    updated_at = datetime('now');

-- 앞으로 발행 사유는 daily_reflection 하나뿐이다. reason은 DB의 CHECK
-- 허용목록이라 여기 없는 값은 조용히 거부된다 — 실천 엽서 단계에서 새 사유를
-- 쓰려면 반드시 이 목록부터 고쳐야 한다(user_events에서 같은 이유로 이벤트를
-- 잃은 적이 있다). 지금은 목록을 건드리지 않는다: CHECK을 바꾸려면 SQLite에선
-- 테이블을 통째로 교체해야 하는데, 쓰지 않는 값이 목록에 남아 있는 것 자체는
-- 아무 해가 없다.
