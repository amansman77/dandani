-- 금주 7일 챌린지 추가
-- Urge Surfing 기반: 술이 필요해진 이유 알아차리기

INSERT INTO challenges (
  name,
  description,
  start_date,
  end_date,
  created_at
) VALUES (
  '금주 7일: 이유 한 번 보기',
  '중독 심리학자 G. Alan Marlatt의 접근에서 착안한, 술이 당기는 이유를 한 번 떠올려보는 7일 실천 챌린지',
  '2025-11-08',
  '2025-11-14',
  datetime('now')
);

-- practices 데이터 삽입 (방금 생성된 challenge_id 사용)

INSERT INTO practices (
  challenge_id,
  day,
  title,
  description,
  category,
  created_at
)
SELECT
  13,
  day,
  '이유 하나 떠올리기',
  '술이 당길 때, 이유 하나만 떠올려보세요.',
  'Awareness',
  datetime('now')
FROM (
  SELECT 1 AS day UNION ALL
  SELECT 2 UNION ALL
  SELECT 3 UNION ALL
  SELECT 4 UNION ALL
  SELECT 5 UNION ALL
  SELECT 6 UNION ALL
  SELECT 7
);
-- 인기 챌린지 필드 추가
-- 챌린지 선택 화면에서 인기 챌린지를 데이터로 관리

-- challenges 테이블에 is_popular 필드 추가
ALTER TABLE challenges ADD COLUMN is_popular INTEGER DEFAULT 0;

-- 인기 챌린지 설정 예시
-- 예: 특정 챌린지를 인기로 설정
-- UPDATE challenges SET is_popular = 1 WHERE id = [챌린지_ID];

