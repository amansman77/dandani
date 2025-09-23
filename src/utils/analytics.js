// 클라이언트 사이드 이벤트 로깅 유틸리티

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8787';

// 세션 ID 생성 및 관리
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('dandani_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('dandani_session_id', sessionId);
  }
  return sessionId;
};

// 사용자 ID 가져오기
const getUserId = () => {
  return localStorage.getItem('dandani_user_id') || 'anonymous';
};

// 이벤트 로깅 함수
export const logEvent = async (eventType, eventData = {}) => {
  try {
    const userId = getUserId();
    const sessionId = getSessionId();
    
    // 백엔드로 이벤트 전송 (비동기, 실패해도 서비스에 영향 없음)
    fetch(`${API_BASE_URL}/api/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId,
        'X-Session-ID': sessionId,
        'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'X-Client-Time': new Date().toISOString()
      },
      body: JSON.stringify({
        event_type: eventType,
        event_data: eventData,
        timestamp: new Date().toISOString()
      })
    }).catch(error => {
      // 이벤트 로깅 실패는 조용히 처리
      console.debug('Analytics event logging failed:', error);
    });
  } catch (error) {
    // 이벤트 로깅 실패는 조용히 처리
    console.debug('Analytics event logging error:', error);
  }
};

// 페이지 방문 이벤트
export const logPageVisit = (page) => {
  logEvent('page_visit', { page });
};

// 실천 과제 조회 이벤트
export const logPracticeView = (practiceId, challengeId, day) => {
  logEvent('practice_view', { practice_id: practiceId, challenge_id: challengeId, day });
};

// 실천 완료 이벤트
export const logPracticeComplete = (challengeId, practiceDay, moodChange, wasHelpful) => {
  logEvent('practice_complete', { 
    challenge_id: challengeId, 
    practice_day: practiceDay,
    mood_change: moodChange,
    was_helpful: wasHelpful
  });
};

// 피드백 제출 이벤트
export const logFeedbackSubmit = (challengeId, practiceDay, moodChange, wasHelpful) => {
  logEvent('feedback_submit', { 
    challenge_id: challengeId, 
    practice_day: practiceDay,
    mood_change: moodChange,
    was_helpful: wasHelpful
  });
};

// AI 상담 시작 이벤트
export const logAIChatStart = () => {
  logEvent('ai_chat_start', {});
};

// AI 상담 메시지 이벤트
export const logAIChatMessage = (messageLength) => {
  logEvent('ai_chat_message', { message_length: messageLength });
};

// 챌린지 시작 이벤트
export const logChallengeStart = (challengeId) => {
  logEvent('challenge_start', { challenge_id: challengeId });
};

// 챌린지 완료 이벤트
export const logChallengeComplete = (challengeId) => {
  logEvent('challenge_complete', { challenge_id: challengeId });
};

// 온보딩 완료 이벤트
export const logOnboardingComplete = () => {
  logEvent('onboarding_complete', {});
};

// Timefold 봉투 생성 이벤트
export const logTimefoldEnvelopeCreate = (challengeId, unlockDate) => {
  logEvent('timefold_envelope_create', { 
    challenge_id: challengeId, 
    unlock_date: unlockDate 
  });
};

// 사용자 활동 추적을 위한 자동 이벤트 로깅
export const initAnalytics = () => {
  // 페이지 로드 시 자동으로 페이지 방문 이벤트 로깅
  logPageVisit('app_load');
  
  // 페이지 언로드 시 세션 종료 이벤트 로깅
  window.addEventListener('beforeunload', () => {
    logEvent('session_end', {});
  });
  
  // 페이지 가시성 변경 시 이벤트 로깅
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      logEvent('page_hidden', {});
    } else {
      logEvent('page_visible', {});
    }
  });
};

const analytics = {
  logEvent,
  logPageVisit,
  logPracticeView,
  logPracticeComplete,
  logFeedbackSubmit,
  logAIChatStart,
  logAIChatMessage,
  logChallengeStart,
  logChallengeComplete,
  logOnboardingComplete,
  logTimefoldEnvelopeCreate,
  initAnalytics
};

export default analytics;
