import { writeFirstUTMOnce } from './posthog-first-utm';
import { getCurrentUTM } from './attribution';
import { logEvent, logPostHogEvent } from './analytics-transport';
export { logEvent } from './analytics-transport';

// 페이지 방문 이벤트 — utm_source/medium/campaign을 같이 남겨서, D1만 보고도
// 캠페인별 방문→작성→지속 퍼널을 집계할 수 있게 한다 (전엔 UTM이 PostHog
// Person 속성에만 있어서 D1 쪽 실제 사용 이벤트와 못 엮였다).
export const logPageVisit = (page) => {
  logEvent('page_visit', { page, ...getCurrentUTM() });
};

// 실천 과제 조회 이벤트
export const logPracticeView = (practiceId, challengeId, day) => {
  logEvent('practice_view', { practice_id: practiceId, challenge_id: challengeId, day });
};

// 실천 완료 이벤트
export const logPracticeComplete = (challengeId, practiceDay, moodChange, wasHelpful) => {
  const eventProperties = {
    challenge_id: challengeId, 
    practice_day: practiceDay,
    mood_change: moodChange,
    was_helpful: wasHelpful
  };

  logEvent('practice_complete', eventProperties);
  // 신규 퍼널 이벤트명 병행 추적 (PostHog 전용)
  logPostHogEvent('practice_completed', eventProperties);
};

// 피드백 제출 이벤트
export const logFeedbackSubmit = (challengeId, practiceDay, moodChange, wasHelpful) => {
  const eventProperties = {
    challenge_id: challengeId, 
    practice_day: practiceDay,
    mood_change: moodChange,
    was_helpful: wasHelpful
  };

  logEvent('feedback_submit', eventProperties);
  // 신규 퍼널 이벤트명 병행 추적 (PostHog 전용)
  logPostHogEvent('record_submitted', eventProperties);
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

export const logChallengeUpsellShown = (storyId) => {
  logEvent('challenge_upsell_shown', { story_id: storyId });
};

export const logChallengeUpsellDeclined = (storyId) => {
  logEvent('challenge_upsell_declined', { story_id: storyId });
};

export const logChallengeDayLogged = (challengeId, loggedDays) => {
  logEvent('challenge_day_logged', { challenge_id: challengeId, logged_days: loggedDays });
};

export const logPhraseOnboardingShown = () => {
  logEvent('phrase_onboarding_shown', {});
};

export const logPhraseExampleUsed = (example) => {
  logEvent('phrase_example_used', { example });
};

export const logSplashShown = () => {
  logEvent('splash_shown', { ...getCurrentUTM() });
};

export const logSplashDone = (method, ms) => {
  logEvent('splash_done', { method, ms, ...getCurrentUTM() });
};

export const logSplashBypassed = () => {
  logEvent('splash_done', { method: 'bypassed', ms: 0, ...getCurrentUTM() });
};

export const logPhraseListSeen = (ms) => {
  logEvent('phrase_list_seen', { ms, ...getCurrentUTM() });
};

export const logPhraseListEngaged = (kind) => {
  logEvent('phrase_list_engaged', { kind, ...getCurrentUTM() });
};

export const logPhraseShared = (method) => {
  logEvent('phrase_shared', { method });
};

export const logPhraseDayLogged = (phraseId, loggedDays) => {
  logEvent('phrase_day_logged', { phrase_id: phraseId, logged_days: loggedDays });
};

export const logChallengeCompleted = (challengeId, practiceDay) => {
  logEvent('challenge_completed', {
    challenge_id: challengeId,
    practice_day: practiceDay
  });
};

export const logAssistantOpened = (challengeId, practiceDay) => {
  logEvent('assistant_opened', {
    challenge_id: challengeId,
    practice_day: practiceDay
  });
};

export const logAssistantSkipped = (challengeId, practiceDay) => {
  logEvent('assistant_skipped', {
    challenge_id: challengeId,
    practice_day: practiceDay
  });
};

export const logAssistantCompleted = (challengeId, practiceDay, emotion) => {
  logEvent('assistant_completed', {
    challenge_id: challengeId,
    practice_day: practiceDay,
    emotion
  });
};

export const logRecordCreated = (challengeId, practiceDay, source) => {
  logEvent('record_created', {
    challenge_id: challengeId,
    practice_day: practiceDay,
    source
  });
};

// 온보딩 완료 이벤트
export const logOnboardingComplete = () => {
  logEvent('onboarding_complete', {});
  // 신규 퍼널 이벤트명 병행 추적 (PostHog 전용)
  logPostHogEvent('onboarding_completed', {});
};

// 다음날 재방문 훅 이벤트 (PostHog 전용)
export const logReturnNextDay = (challengeId, practiceDay) => {
  logPostHogEvent('return_next_day', {
    challenge_id: challengeId,
    practice_day: practiceDay
  });
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

  // 우리 D1에 남기는 방문 기록은 PostHog와 상관없이 곧바로 남긴다.
  // 예전엔 이 호출이 PostHog의 loaded 콜백 안에서만 일어나서, 광고 차단기나
  // 추적 방지로 PostHog 스크립트가 막힌 사용자는 page_visit이 단 한 번도
  // 안 남았다. 그 사용자는 "N번째 아침"이 영원히 1에 머물렀고, 캠페인 리포트
  // 에서도 방문 자체가 통째로 빠졌다(실제 사용자 제보로 발견).
  logPageVisit('app_load');

  // first_utm_*는 PostHog Person 속성이라 PostHog가 떠야만 쓸 수 있다.
  // 이건 못 써도 서비스에 영향이 없으므로 기다리다 포기해도 된다.
  const waitForPostHog = () => {
    if (typeof window !== 'undefined' && window.posthog) {
      writeFirstUTMOnce();
      return;
    }
    const maxWaitTime = 3000;
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (typeof window !== 'undefined' && window.posthog) {
        clearInterval(checkInterval);
        writeFirstUTMOnce();
      } else if (Date.now() - startTime > maxWaitTime) {
        clearInterval(checkInterval);
        console.warn('[Analytics] PostHog init timeout — first_utm 저장은 건너뜀');
      }
    }, 100);
  };

  waitForPostHog();
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
  logChallengeCompleted,
  logChallengeSelected,
  logAssistantOpened,
  logAssistantSkipped,
  logAssistantCompleted,
  logRecordCreated,
  logOnboardingComplete,
  logReturnNextDay,
  logTimefoldEnvelopeCreate,
  initAnalytics
};

export default analytics;
