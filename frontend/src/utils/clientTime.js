// 서버가 "오늘"을 사용자 로컬 자정(국가별 타임존) 기준으로 판단할 수 있도록,
// 요청마다 클라이언트 시각·타임존을 실어 보낸다. 서버의 getClientLocalDate가
// 이 헤더를 읽어서 "며칠에 기록된 것으로 칠지"를 정한다(workers/src/core.js).
export const getClientTimeHeaders = () => ({
  'X-Client-Time': new Date().toISOString(),
  'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
});
