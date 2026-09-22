// 현재 문장 API는 서버 시각과 이 시간대로 오늘을 계산한다.
// X-Client-Time은 기존 클라이언트 헤더 계약을 유지하기 위해 함께 보낸다.
export const getClientTimeHeaders = () => ({
  'X-Client-Time': new Date().toISOString(),
  'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
});
