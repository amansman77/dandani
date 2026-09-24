// 'YYYY-MM-DD'를 "2026년 9월 23일"로. Date로 파싱하면 UTC로 읽혀서 기기
// 시간대에 따라 하루가 밀린다 — 실천한 날이 밀리면 증명이 틀리므로 직접 쪼갠다.
export const formatPracticedOn = (value) => {
  if (typeof value !== 'string') return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '';
  return `${Number(year)}년 ${Number(month)}월 ${Number(day)}일`;
};
