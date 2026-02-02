-- 부부 사이 신혼처럼 좋아지는 마법의 문장
-- 인스타에서 2만명이 공감한 부부 대화 기반 7일 챌린지

INSERT INTO challenges (
  name,
  description,
  start_date,
  end_date,
  created_at
) VALUES (
  '부부 사이 신혼처럼 좋아지는 마법의 문장',
  '인스타에서 2만명이 공감한 부부 대화를 바탕으로, 하루 한 문장을 꺼내보는 7일 실천 챌린지',
  '2026-02-02',
  '2026-02-08',
  datetime('now')
);

-- practices 데이터 삽입 (challenge_id는 예시로 14 사용)
-- 실제 환경에서는 방금 생성된 challenge_id로 교체

INSERT INTO practices (
  challenge_id,
  day,
  title,
  description,
  category,
  created_at
)
VALUES
  (14, 1, '고생 많았어', '“나 없는 동안 우리 가족 위해 고생 많았어”', 'Relationship', datetime('now')),
  (14, 2, '편안함의 이유', '“당신 덕분에 우리 집이 이렇게 편안한 거야”', 'Relationship', datetime('now')),
  (14, 3, '미안함 꺼내기', '“내가 욱해서 말이 심했어. 상처 줘서 정말 미안해”', 'Relationship', datetime('now')),
  (14, 4, '함께의 즐거움', '“당신이랑 같이 있는 게 세상에서 제일 재밌어”', 'Relationship', datetime('now')),
  (14, 5, '사랑 표현하기', '“사랑해. 이 말로는 다 표현이 안 되네”', 'Relationship', datetime('now')),
  (14, 6, '존재의 감사', '“내 옆에 네가 있어. 난 너무 행복해”', 'Relationship', datetime('now')),
  (14, 7, '함께의 약속', '“우리 행복하고 건강하게 살자”', 'Relationship', datetime('now'));