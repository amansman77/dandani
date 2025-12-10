-- 아침 선언 7일 챌린지 추가
-- Experiment v2 대응: 짧고 쉬운 실천 챌린지

-- 챌린지 데이터 삽입
INSERT INTO challenges (name, description, start_date, end_date, created_at)
VALUES (
  '자존감을 높이는 아침 1분 루틴',
  '성공한 사업가 고토 하야토의 노하우',
  '2025-11-01',
  '2025-11-07',
  datetime('now')
);

-- practices 데이터 삽입
-- challenge_id = 12
INSERT INTO practices (challenge_id, day, title, description, category, created_at) VALUES
(12, 1, '아침 선언', '기분 좋은 하루의 모습을 떠올려 보세요. 오늘 하루가 모두 잘될 거라 마음속으로 다짐해보세요.', 'Mindset', datetime('now')),
(12, 2, '아침 선언', '기분 좋은 하루의 모습을 떠올려 보세요. 오늘 하루가 모두 잘될 거라 마음속으로 다짐해보세요.', 'Mindset', datetime('now')),
(12, 3, '아침 선언', '기분 좋은 하루의 모습을 떠올려 보세요. 오늘 하루가 모두 잘될 거라 마음속으로 다짐해보세요.', 'Mindset', datetime('now')),
(12, 4, '아침 선언', '기분 좋은 하루의 모습을 떠올려 보세요. 오늘 하루가 모두 잘될 거라 마음속으로 다짐해보세요.', 'Mindset', datetime('now')),
(12, 5, '아침 선언', '기분 좋은 하루의 모습을 떠올려 보세요. 오늘 하루가 모두 잘될 거라 마음속으로 다짐해보세요.', 'Mindset', datetime('now')),
(12, 6, '아침 선언', '기분 좋은 하루의 모습을 떠올려 보세요. 오늘 하루가 모두 잘될 거라 마음속으로 다짐해보세요.', 'Mindset', datetime('now')),
(12, 7, '아침 선언', '기분 좋은 하루의 모습을 떠올려 보세요. 오늘 하루가 모두 잘될 거라 마음속으로 다짐해보세요.', 'Mindset', datetime('now'));

