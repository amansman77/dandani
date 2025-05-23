-- 6월 챌린지 추가
-- INSERT INTO challenges (name, description, start_date, end_date, created_at)
-- VALUES (
--   '중심 회복 챌린지',
--   '하루 한 문장, 내 중심을 되찾는 30일',
--   '2025-06-01',
--   '2025-06-30',
--   datetime('now')
-- );

-- 6월 챌린지 실천 과제 추가
INSERT INTO practices (challenge_id, day, title, description, category, created_at)
VALUES
  (5, 1, '흔들림 인식하기', '지금 내가 흔들리고 있다는 걸 인식하는 것만으로도 절반은 해낸 거야.', 'Recovery', datetime('now')),
  (5, 2, '흔들림 이해하기', '흔들림은 실패가 아니라 과정이야.', 'Recovery', datetime('now')),
  (5, 3, '감정 수용하기', '지금 내가 느끼는 감정도, 나의 일부일 뿐이야.', 'Recovery', datetime('now')),
  (5, 4, '감정 견디기', '이 감정은 지나갈 수 있는 것이고, 나는 그걸 견딜 수 있어.', 'Recovery', datetime('now')),
  (5, 5, '중심 잃음 인정하기', '지금 이 순간, 중심을 잃고 있다는 사실을 인정해도 괜찮아.', 'Recovery', datetime('now')),
  (5, 6, '감정 관찰하기', '감정이 나를 통제하는 것이 아니라, 나는 감정을 바라볼 수 있어.', 'Recovery', datetime('now')),
  (5, 7, '흔들림의 의미 찾기', '이 흔들림은 나를 더 단단하게 만들어줄 기회일지도 몰라.', 'Recovery', datetime('now')),
  (5, 8, '상황 재해석하기', '이건 나의 전부가 아니라, 내 하루의 한 장면일 뿐이야.', 'Recovery', datetime('now')),
  (5, 9, '감정 재해석하기', '내가 느낀 감정이 곧 진실은 아니야.', 'Recovery', datetime('now')),
  (5, 10, '책임 재고하기', '이건 내 잘못이 아닐 수도 있어.', 'Recovery', datetime('now')),
  (5, 11, '자기 가치 인식하기', '나는 누군가의 평가보다 더 큰 존재야.', 'Recovery', datetime('now')),
  (5, 12, '타인의 말 재해석하기', '그 말은 그 사람의 문제지, 나의 본질은 변하지 않아.', 'Recovery', datetime('now')),
  (5, 13, '이해 구하기', '지금의 나는 판단이 아니라 이해가 필요해.', 'Recovery', datetime('now')),
  (5, 14, '해석 권리 인식하기', '나는 이 상황을 해석할 권리가 있어.', 'Recovery', datetime('now')),
  (5, 15, '자기 강점 인식하기', '나는 내가 생각하는 것보다 더 단단한 사람이야.', 'Recovery', datetime('now')),
  (5, 16, '과거 성공 회상하기', '나는 이미 많은 걸 이겨냈고, 이번에도 해낼 수 있어.', 'Recovery', datetime('now')),
  (5, 17, '자기 신뢰 구축하기', '나는 나를 믿는다. 나의 중심은 흔들리지 않아.', 'Recovery', datetime('now')),
  (5, 18, '불안 다루기', '지금 내가 느끼는 불안은 지나갈 수 있어.', 'Recovery', datetime('now')),
  (5, 19, '방향 재설정하기', '나는 내가 선택한 방향을 다시 걸을 수 있어.', 'Recovery', datetime('now')),
  (5, 20, '자기 선택하기', '나는 다시 나를 선택한다. 오늘도.', 'Recovery', datetime('now')),
  (5, 21, '회복력 인식하기', '내 안에는 회복할 수 있는 힘이 있다.', 'Recovery', datetime('now')),
  (5, 22, '완벽함 재정의하기', '지금 나에게 필요한 건 완벽함이 아니라 중심이야.', 'Recovery', datetime('now')),
  (5, 23, '자기 말 찾기', '오늘 내가 나에게 해줄 수 있는 말을 찾자.', 'Recovery', datetime('now')),
  (5, 24, '자기 정체성 확인하기', '중심을 잃은 것처럼 느껴질 뿐, 나는 여전히 나야.', 'Recovery', datetime('now')),
  (5, 25, '자기 지지하기', '나는 내 편이 될 수 있어. 그리고 지금이 그때야.', 'Recovery', datetime('now')),
  (5, 26, '단순함 찾기', '내 마음이 복잡할수록, 내 말은 단순해야 해. "괜찮아."', 'Recovery', datetime('now')),
  (5, 27, '자기 말의 중요성 인식하기', '어떤 말보다도, 내가 나에게 건네는 말이 중요해.', 'Recovery', datetime('now')),
  (5, 28, '작은 행동 시작하기', '내가 나를 지키기 위해 오늘 할 수 있는 행동은 하나면 충분해.', 'Recovery', datetime('now')),
  (5, 29, '중심 찾기', '나는 지금, 다시 나를 중심에 두고 있다.', 'Recovery', datetime('now')),
  (5, 30, '회복 완성하기', '"나는 내 중심으로 돌아왔다." 이 말로 6월을 마무리하자.', 'Recovery', datetime('now'));
