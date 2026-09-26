// 'YYYY-MM-DD'를 "2026년 9월 23일"로. Date로 파싱하면 UTC로 읽혀서 기기
// 시간대에 따라 하루가 밀린다 — 실천한 날이 밀리면 증명이 틀리므로 직접 쪼갠다.
export const formatPracticedOn = (value) => {
  if (typeof value !== 'string') return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '';
  return `${Number(year)}년 ${Number(month)}월 ${Number(day)}일`;
};

// 엽서 그림 아래 한 줄. "언제"와 "그때까지 며칠 되새겼는가"가 같이 있어야
// "이 말을 31일 되새기고, 그날 그렇게 했다"가 한 장에 담긴다.
// 한 번도 되새기지 않고 먼저 살아낸 날도 있어서, 0이면 날짜만 적는다.
export const proofCaption = (practicedOn, loggedDays) => {
  const date = formatPracticedOn(practicedOn);
  if (!date) return '';
  return loggedDays > 0 ? `${date} · 되새김 ${loggedDays}일` : date;
};
