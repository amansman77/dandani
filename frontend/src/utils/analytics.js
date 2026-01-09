// 클라이언트 사이드 이벤트 로깅 유틸리티
// PostHog는 PostHogProvider를 통해 초기화되며 window.posthog로 접근 가능

// Production API URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

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

// PostHog 이벤트 로깅 헬퍼 함수
// PostHogProvider를 통해 초기화되므로 직접 init할 필요 없음
const logPostHogEvent = (eventName, properties = {}) => {
  try {
    if (typeof window !== 'undefined') {
      // PostHog가 초기화될 때까지 대기 (최대 3초)
      const maxWaitTime = 3000;
      const checkInterval = 100;
      let elapsed = 0;
      
      const tryCapture = () => {
        if (window.posthog) {
          const userId = getUserId();
          
          // 사용자 ID 설정 (익명 사용자도 추적)
          if (userId && userId !== 'anonymous') {
            window.posthog.identify(userId);
          }
          
          // 이벤트 전송
          window.posthog.capture(eventName, {
            ...properties,
            timestamp: new Date().toISOString(),
          });
          
          // 프로덕션에서도 주요 이벤트는 로그로 확인
          console.log(`[PostHog] Event captured: ${eventName}`, properties);
          return true;
        }
        return false;
      };
      
      // 즉시 시도
      if (tryCapture()) {
        return;
      }
      
      // PostHog가 아직 초기화되지 않았다면 대기
      const intervalId = setInterval(() => {
        elapsed += checkInterval;
        if (tryCapture() || elapsed >= maxWaitTime) {
          clearInterval(intervalId);
          if (elapsed >= maxWaitTime) {
            console.warn('[PostHog] Event not captured - PostHog initialization timeout:', eventName);
          }
        }
      }, checkInterval);
    }
  } catch (error) {
    // PostHog 이벤트 로깅 실패는 조용히 처리
    console.debug('[PostHog] Event logging error:', error);
  }
};

// 이벤트 로깅 함수
export const logEvent = async (eventType, eventData = {}) => {
  try {
    const userId = getUserId();
    const sessionId = getSessionId();
    
    // 디버깅: page_visit 이벤트 로깅 추적
    if (eventType === 'page_visit') {
      console.log(`[Analytics] Logging page_visit event:`, { eventType, eventData, userId, sessionId });
    }
    
    // PostHog 이벤트 로깅 (주요 이벤트만)
    const posthogEventMap = {
      'page_visit': 'page_visit',
      'challenge_selected': 'challenge_selected',
      'practice_complete': 'practice_complete',
      'feedback_submit': 'practice_recorded',
    };
    
    const posthogEventName = posthogEventMap[eventType];
    if (posthogEventName) {
      logPostHogEvent(posthogEventName, {
        ...eventData,
        event_type: eventType, // 원본 이벤트 타입 유지
      });
    }
    
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
let analyticsInitialized = false;

export const initAnalytics = () => {
  // 중복 초기화 방지
  if (analyticsInitialized) {
    console.debug('[Analytics] initAnalytics already called, skipping duplicate initialization');
    return;
  }
  analyticsInitialized = true;
  
  // PostHog는 PostHogProvider를 통해 자동 초기화됨
  // PostHog 초기화를 기다린 후 페이지 방문 이벤트 로깅
  const waitForPostHog = () => {
    if (typeof window !== 'undefined' && window.posthog) {
      console.log('[Analytics] Initializing analytics, logging page_visit event');
      logPageVisit('app_load');
    } else {
      // PostHog가 아직 초기화되지 않았다면 잠시 후 재시도 (최대 3초)
      const maxWaitTime = 3000;
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (typeof window !== 'undefined' && window.posthog) {
          clearInterval(checkInterval);
          console.log('[Analytics] Initializing analytics, logging page_visit event');
          logPageVisit('app_load');
        } else if (Date.now() - startTime > maxWaitTime) {
          clearInterval(checkInterval);
          console.warn('[Analytics] PostHog initialization timeout, logging page_visit anyway');
          logPageVisit('app_load');
        }
      }, 100);
    }
  };
  
  waitForPostHog();
  
  // 페이지 언로드 시는 별도 이벤트 로깅하지 않음 (허용되지 않는 event_type)
  // window.addEventListener('beforeunload', () => {
  //   logEvent('session_end', {});
  // });
  
  // 페이지 가시성 변경 시도 별도 이벤트 로깅하지 않음 (허용되지 않는 event_type)
  // document.addEventListener('visibilitychange', () => {
  //   if (document.hidden) {
  //     logEvent('page_hidden', {});
  //   } else {
  //     logEvent('page_visible', {});
  //   }
  // });
};

// 챌린지 선택 이벤트 (PostHog 전용)
export const logChallengeSelected = (challengeId, challengeName, totalDays, source) => {
  logEvent('challenge_selected', {
    challenge_id: challengeId,
    challenge_name: challengeName,
    total_days: totalDays,
    source: source
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
  logChallengeComplete,
  logChallengeSelected,
  logOnboardingComplete,
  logTimefoldEnvelopeCreate,
  initAnalytics
};

export default analytics;
