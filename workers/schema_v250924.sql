-- 새로운 챌린지 등록
INSERT INTO challenges (name, description, start_date, end_date, created_at)
VALUES (
  '나를 위로하는 따뜻한 30일 (리팩토링)',
  '감정 위로 중심의 30일 챌린지. 4주 동안 테마별로 2~3개의 핵심 실천을 반복하며 감정적으로 단단해지는 습관을 만듭니다.',
  '2025-09-01',
  '2025-09-30',
  datetime('now')
);

-- practices 데이터 삽입
-- challenge_id = 11

DELETE FROM practices WHERE challenge_id = 11;

-- 1주차: 나 자신 다독이기 (Day 1~7)
INSERT INTO practices (challenge_id, day, title, description, category, created_at) VALUES
(11, 1, '오늘도 수고했어, 괜찮아', '거울을 보며 "오늘도 수고했어, 괜찮아"라고 말해보세요.', 'SelfCare', datetime('now')),
(11, 2, '오늘 감사한 순간', '아무리 작은 것이라도 오늘 감사했던 순간 하나를 떠올려보세요.', 'Gratitude', datetime('now')),
(11, 3, '오늘도 수고했어, 괜찮아', '거울을 보며 "오늘도 수고했어, 괜찮아"라고 말해보세요.', 'SelfCare', datetime('now')),
(11, 4, '오늘 감사한 순간', '아무리 작은 것이라도 오늘 감사했던 순간 하나를 떠올려보세요.', 'Gratitude', datetime('now')),
(11, 5, '오늘도 수고했어, 괜찮아', '거울을 보며 "오늘도 수고했어, 괜찮아"라고 말해보세요.', 'SelfCare', datetime('now')),
(11, 6, '오늘 감사한 순간', '아무리 작은 것이라도 오늘 감사했던 순간 하나를 떠올려보세요.', 'Gratitude', datetime('now')),
(11, 7, '오늘도 수고했어, 괜찮아', '거울을 보며 "오늘도 수고했어, 괜찮아"라고 말해보세요.', 'SelfCare', datetime('now'));

-- 2주차: 감정 인정하기 (Day 8~14)
INSERT INTO practices (challenge_id, day, title, description, category, created_at) VALUES
(11, 8, '힘든 감정 인정하기', '지금 가장 힘든 감정이 있다면, 그것을 있는 그대로 인정해보세요.', 'Emotional', datetime('now')),
(11, 9, '불안 달래주기', '불안하다면 "괜찮아, 지금은 안전해"라고 말해주세요.', 'Emotional', datetime('now')),
(11, 10, '작은 기쁨 느끼기', '오늘 있었던 작은 기쁨을 온전히 느껴보세요.', 'Emotional', datetime('now')),
(11, 11, '힘든 감정 인정하기', '지금 가장 힘든 감정이 있다면, 그것을 있는 그대로 인정해보세요.', 'Emotional', datetime('now')),
(11, 12, '불안 달래주기', '불안하다면 "괜찮아, 지금은 안전해"라고 말해주세요.', 'Emotional', datetime('now')),
(11, 13, '작은 기쁨 느끼기', '오늘 있었던 작은 기쁨을 온전히 느껴보세요.', 'Emotional', datetime('now')),
(11, 14, '힘든 감정 인정하기', '지금 가장 힘든 감정이 있다면, 그것을 있는 그대로 인정해보세요.', 'Emotional', datetime('now'));

-- 3주차: 관계 속의 나 (Day 15~21)
INSERT INTO practices (challenge_id, day, title, description, category, created_at) VALUES
(11, 15, '나를 지켜준 사람에게 감사하기', '나를 지켜준 사람을 떠올리고, 마음으로 감사 인사를 전해보세요.', 'Gratitude', datetime('now')),
(11, 16, '경계선 그리기 연습', '나를 힘들게 하는 것과의 경계선을 마음속에 그려보세요.', 'Boundary', datetime('now')),
(11, 17, '나만의 응원단 떠올리기', '나를 응원해주는 사람들을 마음속 응원단으로 떠올려보세요.', 'Support', datetime('now')),
(11, 18, '나를 지켜준 사람에게 감사하기', '나를 지켜준 사람을 떠올리고, 마음으로 감사 인사를 전해보세요.', 'Gratitude', datetime('now')),
(11, 19, '경계선 그리기 연습', '나를 힘들게 하는 것과의 경계선을 마음속에 그려보세요.', 'Boundary', datetime('now')),
(11, 20, '나만의 응원단 떠올리기', '나를 응원해주는 사람들을 마음속 응원단으로 떠올려보세요.', 'Support', datetime('now')),
(11, 21, '나를 지켜준 사람에게 감사하기', '나를 지켜준 사람을 떠올리고, 마음으로 감사 인사를 전해보세요.', 'Gratitude', datetime('now'));

-- 4주차: 성장과 회복 (Day 22~30)
INSERT INTO practices (challenge_id, day, title, description, category, created_at) VALUES
(11, 22, '여정 돌아보기', '나에게 “잘 버텼어, 고생했어”라고 말해주세요.', 'Growth', datetime('now')),
(11, 23, '미래의 나에게 편지쓰기', '챌린지를 끝낸 나에게 따뜻한 편지를 써보세요.', 'Future', datetime('now')),
(11, 24, '지금 이 순간 소중함 느끼기', '스스로를 쓰다듬으며 "잘하고 있어"라고 말해보세요.', 'Present', datetime('now')),
(11, 25, '여정 돌아보기', '나에게 “잘 버텼어, 고생했어”라고 말해주세요.', 'Growth', datetime('now')),
(11, 26, '미래의 나에게 편지쓰기', '챌린지를 끝낸 나에게 따뜻한 편지를 써보세요.', 'Future', datetime('now')),
(11, 27, '지금 이 순간 소중함 느끼기', '스스로를 쓰다듬으며 "잘하고 있어"라고 말해보세요.', 'Present', datetime('now')),
(11, 28, '여정 돌아보기', '나에게 “잘 버텼어, 고생했어”라고 말해주세요.', 'Growth', datetime('now')),
(11, 29, '미래의 나에게 편지쓰기', '챌린지를 끝낸 나에게 따뜻한 편지를 써보세요.', 'Future', datetime('now')),
(11, 30, '지금 이 순간 소중함 느끼기', '스스로를 쓰다듬으며 "잘하고 있어"라고 말해보세요.', 'Present', datetime('now'));
