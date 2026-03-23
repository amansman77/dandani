# PostHog 설정 상태 점검 보고서

**점검 일시**: 2025-01-27  
**점검 범위**: 프론트엔드 PostHog 설정 및 이벤트 추적 구현 상태

---

## 📋 점검 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| 패키지 설치 | ✅ 정상 | posthog-js@1.150.0 |
| 초기화 코드 | ✅ 정상 | PostHogProvider로 구현 |
| 환경 변수 (로컬) | ⚠️ 미설정 | .env 파일에 POSTHOG 변수 없음 |
| 환경 변수 (프로덕션) | ❓ 미확인 | Cloudflare Pages 대시보드 확인 필요 |
| 이벤트 추적 구현 | ✅ 정상 | 주요 이벤트 모두 구현됨 |
| 이벤트 매핑 | ✅ 정상 | PostHog 전용 이벤트 매핑 완료 |

---

## ✅ 정상 동작 항목

### 1. 패키지 설치
- **위치**: `frontend/package.json`
- **버전**: `posthog-js@^1.150.0`
- **상태**: ✅ 정상 설치됨

### 2. 초기화 코드
- **위치**: `frontend/src/index.js`
- **구현 방식**: PostHogProvider 사용
- **설정 옵션**:
  ```javascript
  {
    api_host: process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only', // 익명 사용자도 추적
    capture_pageview: false, // 수동 캡처
    capture_pageleave: true,
    autocapture: true
  }
  ```
- **상태**: ✅ 정상 구현됨

### 3. 이벤트 추적 구현
- **위치**: `frontend/src/utils/analytics.js`
- **구현된 이벤트**:
  - ✅ `page_visit` - 페이지 방문
  - ✅ `challenge_selected` - 챌린지 선택
  - ✅ `practice_complete` - 실천 완료
  - ✅ `practice_recorded` (feedback_submit) - 피드백 제출
  - ✅ `ai_chat_start` - AI 상담 시작
  - ✅ `ai_chat_message` - AI 상담 메시지
  - ✅ `challenge_complete` - 챌린지 완료
  - ✅ `onboarding_complete` - 온보딩 완료
  - ✅ `timefold_envelope_create` - 편지 생성

### 4. 이벤트 매핑
- **PostHog 전송 이벤트**:
  ```javascript
  {
    'page_visit': 'page_visit',
    'challenge_selected': 'challenge_selected',
    'practice_complete': 'practice_complete',
    'feedback_submit': 'practice_recorded'
  }
  ```
- **상태**: ✅ 주요 이벤트 매핑 완료

### 5. 이벤트 사용 위치
- ✅ `ChallengeSelector.js`: 챌린지 선택 이벤트
- ✅ `App.js`: 실천 완료 이벤트
- ✅ `PracticeRecordModal.js`: 피드백 제출 이벤트
- ✅ `analytics.js`: 자동 페이지 방문 이벤트

---

## ⚠️ 개선 필요 항목

### 1. 로컬 환경 변수 미설정
- **문제**: `.env` 파일에 PostHog 관련 변수가 없음
- **영향**: 로컬 개발 환경에서 PostHog가 동작하지 않음
- **해결 방법**:
  ```bash
  # frontend/.env 파일에 추가
  REACT_APP_POSTHOG_KEY=phc_your_api_key_here
  REACT_APP_POSTHOG_HOST=https://us.i.posthog.com
  ```
- **우선순위**: 중간 (로컬 개발 시 필요)

### 2. 프로덕션 환경 변수 확인 필요
- **문제**: Cloudflare Pages 대시보드에서 환경 변수 설정 상태 확인 필요
- **확인 방법**:
  1. https://dash.cloudflare.com 접속
  2. Pages → `dandani` 프로젝트 선택
  3. Settings → Environment variables 확인
  4. 다음 변수가 Production 환경에 설정되어 있는지 확인:
     - `REACT_APP_POSTHOG_KEY`
     - `REACT_APP_POSTHOG_HOST`
- **우선순위**: 높음 (프로덕션 분석 데이터 수집)

### 3. PostHog 초기화 실패 시 처리
- **현재 상태**: 
  - API Key가 없으면 콘솔 경고만 출력
  - 이벤트 전송 실패 시 조용히 처리 (console.debug)
- **개선 제안**:
  - 개발 환경에서만 상세 로그 출력
  - 프로덕션에서는 에러 리포팅 서비스로 전송 고려
- **우선순위**: 낮음 (현재 구현도 충분함)

---

## 🔍 코드 상세 분석

### PostHog 초기화 플로우

```71:101:frontend/src/index.js
// PostHog 설정
const posthogApiKey = process.env.REACT_APP_POSTHOG_KEY;
const posthogHost = process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com';

// PostHog API Key 확인 (프로덕션에서도 경고 표시)
if (!posthogApiKey) {
  console.warn('[PostHog] REACT_APP_POSTHOG_KEY is not set. PostHog analytics will not work.');
}

const posthogOptions = {
  api_host: posthogHost,
  person_profiles: 'identified_only', // 익명 사용자도 추적
  capture_pageview: false, // 수동으로 페이지뷰를 캡처하므로 자동 캡처 비활성화
  capture_pageleave: true, // 페이지 이탈 캡처
  autocapture: true, // 자동 이벤트 캡처 활성화
  loaded: (posthog) => {
    console.log('[PostHog] Initialized successfully', { 
      apiKey: posthogApiKey ? `${posthogApiKey.substring(0, 10)}...` : 'MISSING',
      host: posthogHost 
    });
    // PostHog 인스턴스를 window에 명시적으로 설정
    if (typeof window !== 'undefined') {
      window.posthog = posthog;
    }
    // PostHog 초기화 완료 후 analytics 초기화
    // 약간의 지연을 두어 window.posthog가 완전히 설정되도록 함
    setTimeout(() => {
      initAnalytics();
    }, 200);
  },
};
```

**분석**:
- ✅ API Key 검증 로직 있음
- ✅ 기본 호스트 설정 (US 리전)
- ✅ 초기화 완료 후 analytics 자동 시작
- ⚠️ API Key가 없어도 PostHogProvider는 렌더링됨 (에러는 발생하지 않음)

### 이벤트 전송 로직

```24:74:frontend/src/utils/analytics.js
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
```

**분석**:
- ✅ PostHog 초기화 대기 로직 (최대 3초)
- ✅ 사용자 ID 자동 식별
- ✅ 타임스탬프 자동 추가
- ✅ 에러 처리 안전하게 구현
- ⚠️ 초기화 타임아웃 시 경고만 출력 (이벤트는 전송되지 않음)

---

## 📊 이벤트 추적 현황

### 추적 중인 이벤트

| 이벤트 타입 | PostHog 이벤트명 | 사용 위치 | 상태 |
|------------|-----------------|----------|------|
| `page_visit` | `page_visit` | `analytics.js` (자동) | ✅ |
| `challenge_selected` | `challenge_selected` | `ChallengeSelector.js` | ✅ |
| `practice_complete` | `practice_complete` | `App.js` | ✅ |
| `feedback_submit` | `practice_recorded` | `PracticeRecordModal.js` | ✅ |
| `challenge_complete` | - | `App.js` (3곳) | ✅ |
| `ai_chat_start` | - | 미사용 | ⚠️ |
| `ai_chat_message` | - | 미사용 | ⚠️ |
| `onboarding_complete` | - | 미사용 | ⚠️ |
| `timefold_envelope_create` | - | 미사용 | ⚠️ |

**참고**: 
- `challenge_complete`는 App.js에서 사용 중이나 PostHog 이벤트 매핑에 포함되지 않음
- `ai_chat_start`, `ai_chat_message`, `onboarding_complete`, `timefold_envelope_create`는 함수는 구현되어 있으나 실제 호출 위치를 찾지 못함

---

## 🎯 권장 조치 사항

### 즉시 조치 (High Priority)

1. **프로덕션 환경 변수 확인**
   - Cloudflare Pages 대시보드에서 환경 변수 설정 확인
   - 설정되어 있지 않다면 즉시 추가
   - 환경 변수 추가 후 재배포 필요

2. **로컬 개발 환경 설정**
   - `.env` 파일에 PostHog 변수 추가 (선택사항)
   - 로컬에서 PostHog 테스트가 필요한 경우에만

### 개선 제안 (Medium Priority)

1. **이벤트 사용 현황 점검**
   - `ai_chat_start`, `ai_chat_message` 등 미사용 이벤트 함수 확인
   - 실제 사용 위치 추가 또는 함수 제거
   - `challenge_complete` 이벤트를 PostHog 이벤트 매핑에 추가 고려

2. **에러 모니터링 강화**
   - PostHog 초기화 실패 시 에러 리포팅 고려
   - 프로덕션에서만 상세 로그 수집

### 향후 개선 (Low Priority)

1. **이벤트 속성 표준화**
   - 모든 이벤트에 공통 속성 추가 (예: app_version, platform)
   - 이벤트 스키마 문서화

2. **A/B 테스트 준비**
   - PostHog 기능 플래그 활용 검토
   - 실험 프레임워크 통합

---

## 📝 체크리스트

### 환경 변수 설정
- [ ] 로컬 `.env` 파일에 PostHog 변수 추가 (선택)
- [ ] Cloudflare Pages Production 환경 변수 확인
- [ ] Cloudflare Pages Preview 환경 변수 확인 (필요시)

### 코드 검증
- [x] PostHog 초기화 코드 확인
- [x] 이벤트 추적 함수 구현 확인
- [ ] 실제 이벤트 사용 위치 전체 점검
- [ ] PostHog 대시보드에서 이벤트 수신 확인

### 테스트
- [ ] 로컬 환경에서 PostHog 이벤트 전송 테스트
- [ ] 프로덕션 환경에서 PostHog 이벤트 수신 확인
- [ ] 브라우저 콘솔에서 PostHog 초기화 로그 확인

---

## 🔗 관련 문서

- [PostHog 공식 문서](https://posthog.com/docs)
- [DEPLOYMENT.md](../DEPLOYMENT.md) - 환경 변수 설정 가이드
- [frontend/src/index.js](../frontend/src/index.js) - PostHog 초기화 코드
- [frontend/src/utils/analytics.js](../frontend/src/utils/analytics.js) - 이벤트 추적 유틸리티

---

**점검 완료일**: 2025-01-27  
**다음 점검 권장일**: 환경 변수 설정 후 또는 주요 기능 추가 시
