# ADR-0005: 피벗 이후 남은 백엔드/D1 자산 — 삭제 대신 문서화

## Status
**Accepted** - 2026-09-06

## Context

2026-08-28(커밋 `a2b2b22`) 단단이는 Story Feed와 Challenge를
버리고 "매일 아침 문장 하나를 되새긴다"는 단일 루프로 완전히 갈아탔습니다. 그때는 롤백
가능성 때문에 이전 코드를 프론트·백엔드 양쪽에 그대로 남겨뒀습니다.

2026-09-06, 프론트엔드 쪽 죽은 코드는 삭제했습니다(커밋 `7d0ed44` — 컴포넌트 24개, 훅 4개,
유틸 6개. `src/index.js`에서 import 그래프를 실제로 따라가 도달 불가능한 파일만 계산).
번들이 241.4 kB → 188.5 kB(gzip)로 줄었습니다.

**백엔드와 D1은 같은 방식으로 지우지 않기로 했습니다.** 이유는 아래 Decision에 적었고,
대신 "무엇이 살아있고 무엇이 죽었는지"를 이 문서로 고정해둡니다. 코드에 흔적이 남아 있는
채로 아무도 그 상태를 모르는 게 제일 위험하기 때문입니다.

### 왜 프론트와 다르게 취급하나

- **프론트의 죽은 코드는 사용자가 매번 내려받는 비용**입니다(번들 크기 = 광고로 들어온
  모바일 사용자의 첫 렌더 시간). 백엔드의 죽은 라우트는 호출되지 않는 한 비용이 0입니다.
- **D1 테이블은 데이터**입니다. 코드는 git에서 되살릴 수 있지만 지운 행은 못 되살립니다.
- 실제로 죽은 테이블의 데이터를 아직 쓰고 있습니다 — 커뮤니티 티커의 곰돌이 푸 인용구들은
  레거시 `challenges`/`practices`에서 찾아낸 내용입니다.

## Decision

백엔드 코드와 D1 테이블은 **삭제하지 않고 이 문서로 상태를 고정**합니다.
새 기능을 붙일 때는 아래 "살아있는 것"만 신뢰하고, "죽은 것"은 참고 자료로만 봅니다.

---

## 인벤토리 (2026-09-06 기준)

### 살아있는 API — 프론트엔드가 실제로 호출

| 라우트 | 서비스 | 비고 |
|---|---|---|
| `GET /api/phrases/active` | `phrase-service.js` | 오늘 탭. `{ phrase: {...} }`로 **중첩** 응답 |
| `GET /api/phrases/history` | `phrase-service.js` | 기록 탭 |
| `GET /api/phrases/community` | `phrase-service.js` | "다른 사람들의 아침" 티커 |
| `POST /api/phrases` | `phrase-service.js` | 문구 시작 → `phrase_start` 이벤트 |
| `POST /api/phrases/:id/log` | `phrase-service.js` | 되새기기 → `phrase_day_logged` |
| `POST /api/phrases/:id/retire` | `phrase-service.js` | 문구 그만두기 → `phrase_retired` |
| `POST /api/analytics/event` | `core.js#logUserEvent` | 모든 클라이언트 이벤트 수집구 |

### 살아있는 내부용 — 크론/운영이 사용

| 라우트·트리거 | 서비스 | 비고 |
|---|---|---|
| `scheduled()` UTC 09:00 | `analytics-service.js` → `discord-service.js` | 일일 보고서 (캠페인 퍼널) |
| `scheduled()` UTC 22:30 | `insight-service.js` | LLM 인사이트 (4종 로테이션) |
| `GET /api/analytics/daily-report` | `analytics-service.js` | 읽기 전용. 퍼널 수동 확인용 |
| `GET /api/analytics/retention` | `analytics-service.js` | 이름만 옛날 것. 내용은 30일 퍼널 |
| `GET /api/analytics/activity` | `activity-service.js` | 일별 활성 사용자 |
| `GET /api/discord/daily-report` | — | **호출 즉시 실제 디스코드로 발송됨.** 주의 |
| `GET /api/discord/daily-insight` | — | 위와 동일 |
| `GET /api/insight/debug` | `insight-service.js` | 발송 없이 인사이트 생성만 |

### 죽은 API — 2026-09-06 라우터에서 제거됨 (커밋 `c93dbc6`)

프론트엔드에서 이들을 부르던 화면은 2026-09-06에 삭제됐고(`7d0ed44`), 같은 날 라우터에서도
등록을 뗐습니다. **지금은 전부 404**입니다(PUT은 핸들러 자체가 없어져 405).
서비스 파일은 아래 표대로 남아 있지만 라우터가 유일한 참조처였기 때문에 **워커 번들에는
더 이상 포함되지 않습니다** — 번들 73.38 KiB → 38.07 KiB (gzip 16.75 → 10.04 KiB).

| 라우트 | 서비스 | 시절 |
|---|---|---|
| `GET /api/practice/today` | `legacy/practice-service.js` | 피벗 이전 |
| `GET /api/challenges`, `/api/challenges/:id` | `legacy/practice-service.js` | 피벗 이전 |
| `GET /api/feedback/record`, `/api/feedback/history` | `legacy/practice-service.js` | 피벗 이전 |
| `POST /api/feedback/submit`, `/api/feedback/update`, `/api/records` | `legacy/practice-service.js` | 피벗 이전 |
| `GET /api/stories`, `/api/stories/:id`, `/api/my-feed` | `legacy/story-service.js` | Story Feed |
| `POST /api/stories/:id/try`, `/api/story-tries/:id/emotion`, `/api/stories/seed` | `legacy/story-service.js` | Story Feed |
| `GET /api/stories/debug-ping` | `legacy/story-service.js` | Story Feed |
| `GET /api/user-challenges/active`, `/api/user-challenges/catalog/:id` | `legacy/challenge-service.js` | Challenge |
| `POST /api/user-challenges`, `/api/user-challenges/:id/log` | `legacy/challenge-service.js` | Challenge |
| `GET/POST /api/timefold/envelope*` | `legacy/timefold-service.js` | **⚠️ 아래 참고** |

> **⚠️ `/api/timefold/envelope`는 죽은 게 아니라 깨져 있습니다.**
> `legacy/timefold-service.js`가 `INSERT INTO timefold_envelopes`를 하는데, **그 테이블은 D1에
> 존재하지 않습니다.** 호출하면 런타임 에러가 납니다. 되살릴 생각이라면 스키마부터
> 만들어야 합니다.

### D1 테이블

| 테이블 | 행 수 | 상태 |
|---|---:|---|
| `user_events` | 4,252 | **살아있음.** 퍼널·리포트의 근간. 과거 챌린지 시절 이벤트도 섞여 있음 |
| `daily_phrases` | 28 | **살아있음.** 현재 제품의 핵심 |
| `daily_phrase_logs` | 200 | **살아있음.** 되새김 기록 |
| `practices` | 293 | 죽음 — 단, **내용이 유용함**(티커의 곰돌이 푸 인용구 출처) |
| `challenges` | 12 | 죽음 — 단, **내용이 유용함**. `is_popular`/`is_recommended` 플래그 있음 |
| `practice_feedback` | 76 | 죽음 (피벗 이전 실천 피드백) |
| `stories` | 30 | 죽음 (Story Feed) |
| `story_tries` | 16 | 죽음 (Story Feed) |
| `user_challenges` | 2 | 죽음 (Challenge v1/v2) |
| `user_challenge_logs` | 2 | 죽음 (Challenge v1/v2) |
| `action_flows` | 19 | **고아** — 어떤 코드도 참조하지 않음 |
| `action_patterns` | 12 | **고아** — 어떤 코드도 참조하지 않음 |
| `identity_dandanis` | 8 | **고아** — 어떤 코드도 참조하지 않음 |
| `user_profiles` | 7 | **고아** — 어떤 코드도 참조하지 않음 |
| `user_sessions` | 5 | **고아** — 어떤 코드도 참조하지 않음 |
| `retention_metrics` | 0 | **고아** — 참조도 없고 데이터도 없음 |

"고아"는 워커 소스 어디에서도 테이블 이름이 등장하지 않는다는 뜻입니다. Story Feed보다도
이전 세대의 잔재로 보입니다.

### 이벤트 타입 허용목록

`workers/src/core.js`의 `ALLOWED_EVENT_TYPES`와 `frontend/src/utils/analytics.js`의
`BACKEND_ALLOWED_EVENT_TYPES`는 **양쪽 다 고쳐야 합니다**(한쪽만 고치면 조용히 버려짐 —
2026-09-01 `schema_v260901_fix_user_events_check.sql` 참고).

현재 실제로 발생하는 이벤트는 `page_visit`, `phrase_onboarding_shown`,
`phrase_example_used`, `phrase_start`, `phrase_day_logged`, `phrase_retired` 6종입니다.
목록에 남아 있는 `practice_*`, `challenge_*`, `ai_chat_*`, `feedback_submit`,
`timefold_envelope_create`, `onboarding_complete`는 아무도 쏘지 않습니다.
(`onboarding_complete`만 예외적으로 프론트에 호출부가 남아 있으나 백엔드로는 안 갑니다.)

---

## Consequences

**좋은 점**
- 되살릴 필요가 생기면 코드도 데이터도 그대로 있습니다.
- 레거시 데이터를 콘텐츠 소스로 계속 쓸 수 있습니다(이미 그렇게 쓰고 있습니다).
- 죽은 라우트는 호출되지 않으므로 런타임 비용이 없습니다.

**나쁜 점 / 감수하는 것**
- `workers/src/legacy/`에 죽은 서비스 파일 4개가 남습니다. 라우터에서 뗀 뒤로는 번들에
  포함되지 않습니다.
- D1에 안 쓰는 테이블 12개가 남습니다.

**진행 상황**
1. ✅ **2026-09-06 (커밋 `c93dbc6`) — 라우터에서 죽은 라우트 제거.** 서비스 파일은 유지.
   인증 없이 열려 있던 쓰기 라우트(`POST /api/stories/seed`는 파라미터로 개수를 받아 AI
   스토리를 생성·저장했습니다)를 닫는 게 목적이라 관측 기간을 두지 않고 바로 뗐습니다 —
   부르는 클라이언트가 없다는 건 프론트 삭제로 이미 확정된 상태였습니다.
2. ⬜ 서비스 파일 삭제 — 며칠 지켜본 뒤 판단
3. ⬜ 테이블은 마지막. 지우기 전에 `challenges`/`practices` 내용은 따로 백업
   (콘텐츠 자산이므로)

## References
- 프론트 죽은 코드 삭제: 커밋 `7d0ed44`
- 피벗: 커밋 `a2b2b22` (2026-08-28)
- 커뮤니티 티커 인용구 출처 조회: `challenges.id=14`, `practices.challenge_id=14`
