# 단단이 (Dandani) 개발 가이드

이 문서는 2026-09-10 현재 작업 트리의 코드 기준이며, 운영 배포·DB 적용 상태를 보장하지 않습니다. 현재 제품은 **문장 작성 → 매일 되새기기 → 기록 확인** 흐름이며, 오늘·기록 두 탭으로 구성됩니다. 챌린지·Story Feed·AI 상담 화면은 현재 실행 경로에 없습니다.

## 구조와 실행 흐름

| 파일·경로 | 역할 |
|---|---|
| `frontend/src/index.js` | React 진입점, MUI 테마·PostHog 초기화 |
| `frontend/src/App.js` | 탭·뒤로가기, 스플래시·온보딩, 편집·공유 상태 |
| `frontend/src/components/DailyPhrase.js` | 문구 리소스·동작 훅을 화면과 연결하고 로딩·오류 표시 |
| `frontend/src/hooks/` | 문구 조회, 오래된 응답 무시, 저장·되새김 중복 요청 방지 |
| `frontend/src/utils/phraseApi.js` | 문구 조회·생성·교체·되새김 HTTP 요청과 오류 메시지 |
| `frontend/src/components/phraseVariants/VariantA.js` | 현재 오늘 화면. B·C는 미사용 디자인 시안 |
| `frontend/src/components/PhraseHistory.js` | 현재·이전 문장과 되새김 일수 |
| `frontend/src/components/CommunityTicker.js` | 다른 사용자의 문장·인용구와 문장 채택 흐름 |
| `frontend/src/components/ShareSheet.js` | 카카오톡·X·링크 공유와 이미지 카드 진입 |
| `frontend/src/components/PhraseCardSheet.js` | 이미지 카드 미리보기·저장·공유 |
| `frontend/src/theme/tokens.js` | 공통 색상·폰트 토큰 |
| `frontend/src/utils/` | 사용자 ID, 날짜 헤더, 분석·UTM, 공유 유틸리티 |
| `workers/src/index.js` | HTTP 요청과 cron 진입점 |
| `workers/src/router.js` | 현재 GET·POST API 등록과 공통 오류 응답 |
| `workers/src/phrase-service.js` | 문구 조회·종료·되새김·커뮤니티·기록 SQL 처리 |
| `workers/src/phrase-mutations.js` | 문구 생성과 원자적 교체·재시도 처리 |
| `workers/src/phrase-dates.js` | 서버 시각·요청 시간대 기준 날짜와 방문 일수 계산 |
| `workers/src/admin-auth.js`, `admin-router.js` | 운영 API 인증, 입력 검증, 보고·인사이트 작업 |
| `workers/src/core.js` | CORS, 사용자 ID, 날짜 계산, 이벤트 저장 |
| `workers/src/analytics-service.js` | 문구 기반 퍼널·캠페인·일일 보고 집계 |
| `workers/src/insight-service.js` | NVIDIA API를 통한 운영용 인사이트 생성 |
| `workers/src/discord-service.js` | 운영 보고 메시지 구성·전송 |
| `workers/schemas/` | 날짜별 SQL 파일. 전체를 순차 실행하는 마이그레이션 설정은 없음 |
| `workers/wrangler.toml` | Worker 이름, D1 `DB` 바인딩, cron 설정 |
| `frontend/ios/`, `frontend/android/` | Capacitor 네이티브 프로젝트 |
| `automation/ux-check/` | 별도 npm 프로젝트인 Playwright UX 관찰 자동화 |

주요 요청은 `DailyPhrase` → `hooks/` → `phraseApi.js` → Worker `router.js` → `phrase-service.js` 또는 `phrase-mutations.js` → D1 순서로 처리됩니다. React 상태와 props로 화면을 연결하며, 탭 이동은 브라우저 History API를 사용합니다.

## 로컬 환경 설정

### Node.js와 의존성

루트 `package.json`은 `frontend`, `workers`를 npm workspaces로 묶습니다. 루트 잠금 파일을 사용하는 아래 절차를 기준으로 합니다.

루트 `package-lock.json`의 Wrangler 4.53.0과 Capacitor CLI 7.4.4는 Node.js 20 이상을 요구합니다. `.nvmrc`에는 이전 값인 `18.19.0`이 남아 있으므로 인자 없는 `nvm use` 대신 버전을 명시합니다. 아래 예시는 Node.js 22를 사용합니다.

```bash
# 저장소 루트
nvm install 22
nvm use 22
npm ci
```

각 하위 디렉터리에도 별도 잠금 파일이 있고, 특히 Workers의 잠긴 Wrangler 버전은 루트와 다릅니다. 설치 위치를 섞거나 문제 해결 목적으로 잠금 파일을 삭제하지 않습니다.

### 프론트엔드 환경 변수

`frontend/.env.local`을 만들고 다음 값을 설정합니다.

```dotenv
REACT_APP_API_URL=http://localhost:8787
REACT_APP_ENVIRONMENT=dev
```

| 변수 | 용도·기본 동작 |
|---|---|
| `REACT_APP_API_URL` | API 주소. 미설정 시 운영 Worker 주소 사용 |
| `REACT_APP_ENVIRONMENT` | 분석 이벤트의 환경 값. 미설정 시 `NODE_ENV`에 따라 `prod` 또는 `dev` |
| `REACT_APP_POSTHOG_KEY` | PostHog 프로젝트 키. 미설정 시 경고가 나오며 PostHog 분석이 동작하지 않음 |
| `REACT_APP_POSTHOG_HOST` | 기본값 `https://us.i.posthog.com` |
| `REACT_APP_KAKAO_JS_KEY` | 카카오 공유용 JavaScript 키. 비어 있으면 해당 버튼 숨김 |
| `GENERATE_SOURCEMAP` | CRA 빌드 소스맵 생성 설정 |

`frontend/.env.example`의 키 값은 예시 문자열입니다. 사용하지 않는 PostHog·카카오 설정은 예시 값을 그대로 넣지 말고 생략합니다. 카카오 공유를 사용할 때는 앱의 SDK 도메인 설정도 맞춰야 합니다.

프론트엔드 환경 변수는 번들에 포함되므로 서버 비밀 키를 넣지 않습니다. 값을 바꾼 뒤 개발 서버를 재시작하고, 배포 환경에서는 다시 빌드합니다. 빌드 스크립트는 `REACT_APP_KAKAO_JS_KEY`가 비어 있으면 `KAKAO_JAVASCRIPT_KEY` 값을 대신 사용합니다.

### 로컬 D1 초기화

문구 기능에는 `daily_phrases`, `daily_phrase_logs`, `user_events`가 필요합니다. **새 로컬 DB**는 아래 순서로 준비합니다. 모든 명령의 `--local`을 유지합니다.

```bash
cd workers
npx wrangler d1 execute dandani-db --local --file=schemas/schema_v250923_1.sql
npx wrangler d1 execute dandani-db --local --file=schemas/schema_v260901_fix_user_events_check.sql
npx wrangler d1 execute dandani-db --local --file=schemas/schema_v260828_daily_phrases.sql
npx wrangler d1 execute dandani-db --local --file=schemas/preflight_v260910_active_phrases.sql
# 위 조회 결과가 없을 때 계속합니다.
npx wrangler d1 execute dandani-db --local --file=schemas/schema_v260910_active_phrase_unique.sql
npx wrangler d1 execute dandani-db --local --file=schemas/schema_v260910_phrase_replacement.sql
```

첫 파일은 `user_events`와 과거 분석용 테이블·뷰를 만듭니다. 두 번째 파일은 기존 `user_events`를 재생성해 오래된 이벤트 타입 CHECK 제약을 제거합니다. 세 번째 파일은 문구와 되새김 기록 테이블을 만듭니다. 사전 조회는 사용자별 중복 활성 문구를 확인합니다. 이후 SQL은 활성 문구 부분 고유 인덱스와 교체 연결용 `replacement_id` 컬럼을 추가합니다. 챌린지 콘텐츠 seed는 현재 문구 흐름에 필요하지 않습니다.

중복 조회 결과가 있으면 먼저 처리 방침을 검토합니다. 고유 인덱스 적용은 중복이 있으면 실패하며 기존 문구를 자동 삭제·종료하지 않습니다. `replacement_id` 추가 SQL은 한 번만 적용합니다.

이 절차는 운영 DB 업데이트 지침이 아닙니다. 기존 DB는 먼저 적용 상태를 확인하고 필요한 SQL만 실행합니다. `workers/schemas/`에는 데이터 삽입과 테이블 재생성이 섞여 있어 전체 파일 일괄 실행을 전제로 하지 않습니다.

### 서버 실행

저장소 루트의 별도 터미널에서 실행합니다.

```bash
# 터미널 1: http://localhost:8787
npm run dev:workers
```

```bash
# 터미널 2: http://localhost:3000
npm run start:frontend
```

문구 기능에는 운영용 키가 필요하지 않습니다. 운영 HTTP API를 로컬에서 확인할 때는 `workers/.dev.vars`에 `ADMIN_API_TOKEN`을 설정합니다. 실제 Discord 발송에는 `DISCORD_WEBHOOK_URL`, LLM 인사이트 생성에는 `NVIDIA_API_KEY`도 필요합니다. 이 값들은 저장소에 커밋하거나 프론트엔드 환경 변수에 넣지 않습니다.

## 사용자 식별과 날짜

- `utils/userId.js`가 사용자 ID를 만들고 `localStorage`의 `dandani_user_id`에 저장합니다. 온보딩 완료 상태도 브라우저에 저장합니다.
- 문구 API는 `X-User-ID`를 필수로 받습니다. 현재 코드의 검사는 헤더의 존재·공백 여부이며 로그인 토큰 검증은 없습니다. 브라우저 저장소를 지우거나 다른 기기로 접속하면 기존 기록이 자동 연결되지 않습니다.
- `utils/clientTime.js`는 `X-Client-Time`과 `X-Client-Timezone`(예: `Asia/Seoul`)을 보냅니다. 현재 문구 API의 오늘은 **서버 현재 시각과 요청 시간대**로 계산하며, `X-Client-Time`은 날짜 결정에 사용하지 않습니다. 시간대가 없거나 잘못되면 UTC로 처리합니다.
- 활성 문구 응답의 `today`는 `YYYY-MM-DD`이며 화면 날짜와 연속 되새김 눈금의 기준입니다. 눈금은 달력 날짜를 이동해 계산하므로 DST의 하루 길이에 의존하지 않습니다.
- `visit_days`는 문구 시작 이후 UTC 방문 시각을 요청 시간대의 날짜로 변환하고, 되새김 날짜와 합쳐 중복을 제거합니다. 오늘 이전 날짜 수에 오늘 요청을 한 번 더합니다. 시간대가 바뀌면 과거 방문일은 현재 시간대로 재해석되지만 되새김 날짜는 기록 당시 값을 유지합니다.
- D1의 생성·종료 시각과 운영 집계는 UTC 기준입니다. 레거시 `getClientLocalDate`는 현재 문구 API의 날짜 계산 경로가 아닙니다.

## 문구 API

기준 주소는 로컬 `http://localhost:8787`입니다. 아래 문구 API는 모두 `X-User-ID`가 필요합니다. POST 요청은 `Content-Type: application/json`을 사용합니다.

| 메서드 | 경로 | 입력·응답 |
|---|---|---|
| GET | `/api/phrases/active` | `{ phrase: null }` 또는 `{ phrase: { id, phrase, status, started_at, today, logged_days, logged_dates, logged_today, visit_days } }` |
| POST | `/api/phrases` | `{ "phrase": "나에게 필요한 문장" }` → `{ id, phrase, status }` |
| POST | `/api/phrases/:id/replace` | `{ "phrase": "새 문장" }` → `{ id, phrase, status }`; 기존 기록 보존 |
| POST | `/api/phrases/:id/log` | 요청 본문은 사용하지 않음 → `{ logged_days }` |
| POST | `/api/phrases/:id/retire` | 요청 본문은 사용하지 않음 → `{ success: true }` |
| GET | `/api/phrases/history` | `{ phrases: [...] }`; 현재·종료 문구와 문구별 기록 날짜·일수 |
| GET | `/api/phrases/community` | `{ items: [{ nickname, phrase, logged_days }] }`; 다른 사용자의 최근 활성 문구 최대 20개 |

성공 응답은 200입니다. 입력 오류는 400, 문구 미발견은 404, 활성 문구 중복·이미 변경된 문구 등 상태 충돌은 409이며 `{ error: message }`를 반환합니다. 예기치 않은 오류는 내부 내용을 숨긴 500 응답과 `request_id`를 반환합니다. 미등록 경로는 404, 지원하지 않는 메서드는 405이며 OPTIONS는 CORS 응답을 반환합니다.

문구 생성·교체는 문자열이 아니거나 공백뿐인 입력을 거부하고 앞뒤 공백을 제거합니다. 이미 활성 문구가 있으면 생성은 409입니다. 교체는 단일 `/replace` 요청으로 기존 문구 종료와 새 문구 생성을 D1 batch에서 처리합니다. 삽입 실패 시 종료도 롤백되고 이전 기록은 보존됩니다.

동일 원본에 같은 문장으로 재시도하면 연결된 교체 문구가 아직 활성인 경우 기존 결과를 반환합니다. 다른 문장으로 경쟁하거나 교체 문구가 이미 종료됐다면 409입니다. 다른 사용자의 원본은 404입니다. 분석 이벤트는 batch 밖에서 최선형(best-effort)으로 기록하며 저장 실패가 문구 교체를 되돌리지는 않습니다.

`daily_phrase_logs`의 `UNIQUE(phrase_id, log_date)`와 `INSERT OR IGNORE`가 동일 문장·날짜의 중복 기록을 막습니다. 사용자별 활성 문구 하나는 조건부 INSERT와 `status = 'active'` 부분 고유 인덱스로 제한합니다. 되새김 INSERT도 활성 상태를 다시 확인하며, 종료된 문구에 대한 기록 요청은 409입니다.

## 분석과 운영 작업

`POST /api/analytics/event`는 문자열 `event_type`과 선택적 객체 `event_data`를 받아 `user_events`에 저장합니다. 잘못된 JSON이나 입력 형식은 400입니다. 클라이언트는 사용자·세션 ID와 시간 헤더를 함께 보냅니다. 허용 목록 밖 이벤트나 저장 실패가 있어도 현재 수집 API는 `{ success: true }`를 반환하므로 응답만으로 저장 성공을 판단하지 않습니다.

| 이벤트 | 발생 위치 |
|---|---|
| `page_visit` | 앱 분석 초기화 시 |
| `onboarding_complete` | 온보딩 완료·건너뛰기 |
| `phrase_onboarding_shown`, `phrase_example_used` | 문구 입력 안내·예시 선택 |
| `phrase_start`, `phrase_retired` | 문구 생성·종료 서비스에서 기록 |
| `phrase_day_logged` | 되새김 API 성공 후 프론트엔드에서 전송 |
| `phrase_shared` | 공유 기능에서 전송 |

PostHog에는 페이지뷰·온보딩 등 별도로 매핑한 이벤트와 최초 UTM 속성을 보냅니다. 모든 문구 이벤트가 PostHog에 전달되는 것은 아닙니다. D1 방문 이벤트 전송은 PostHog 초기화와 독립적입니다. 이벤트 타입 추가 시 프론트엔드 `analytics-transport.js`의 `BACKEND_ALLOWED_EVENT_TYPES`와 백엔드 `core.js`의 `ALLOWED_EVENT_TYPES`를 함께 확인합니다.

| 메서드·경로 | 역할 |
|---|---|
| GET `/api/analytics/retention` | 최근 30일 퍼널·캠페인 집계. 과거 이름을 유지한 API |
| GET `/api/analytics/activity?days=30` | 일별 활성 사용자와 이벤트별 통계 |
| GET `/api/analytics/daily-report?date=YYYY-MM-DD` | 지정일 스냅샷과 현재 시점의 최근 30일 퍼널·추세 |
| GET `/api/insight/debug?category=data` | 인사이트 생성. `data`, `growth`, `interview`는 외부 LLM 호출, `ux`는 `null` |
| GET `/api/discord/daily-report` | 실제 Discord 보고 발송 |
| GET `/api/discord/daily-insight` | 인사이트 생성·실제 Discord 발송. UX 차례에는 건너뜀 |

위 운영 HTTP 경로는 `Authorization: Bearer <ADMIN_API_TOKEN>`이 필요합니다. 토큰 누락·불일치는 401, 서버의 `ADMIN_API_TOKEN` 미설정은 503이며 작업 실행 전에 차단합니다. 공개 문구·이벤트 API에는 이 인증을 요구하지 않으며 내부 cron도 이 HTTP 인증을 거치지 않습니다.

`days`는 1~365 정수, `date`는 유효한 `YYYY-MM-DD`, `category`는 `data`, `ux`, `growth`, `interview` 중 하나여야 합니다. 잘못된 값은 400입니다. Discord 경로는 GET이어도 외부 전송이 발생하므로 단순 조회용 스모크 테스트에 포함하지 않습니다.

`wrangler.toml`의 cron은 `0,30 9,22 * * *`이며 `index.js`가 실행 시각을 분기합니다.

| UTC | 한국 시각 | 동작 |
|---|---|---|
| 09:00 | 18:00 | 일일 보고서 발송 |
| 22:30 | 다음 날 07:30 | 운영 인사이트 생성·발송 |
| 09:30, 22:00 | 18:30, 다음 날 07:00 | 작업 없음 |

인사이트는 UTC 날짜에 따라 `data → ux → growth → interview`를 순환합니다. UX 차례는 Worker가 건너뛰고 로컬 `automation/ux-check`가 담당합니다.

## 검증

루트에서 프론트엔드 정적 검사와 빌드를 실행할 수 있습니다.

```bash
npm run lint --workspace=frontend
npm run build:frontend
```

회귀 테스트는 루트에서 다음과 같이 실행합니다.

```bash
CI=true npm test --workspace=frontend -- --watchAll=false --runInBand
npm test --workspace=workers
```

프론트엔드는 문구 API·화면, 분석 사용자 식별, 연속 기록·DST 계산을 테스트합니다. Workers는 Node.js 테스트 러너와 설치된 Wrangler의 Miniflare/D1 에뮬레이터로 교체 롤백·재시도·동시성, 날짜 경계, 운영 API 인증·입력 오류를 검증합니다. 테스트 Worker 시각은 고정되며 외부 요청은 테스트 대역으로 차단합니다. 테스트용 DB는 각 테스트에서 준비하므로 개발 DB를 직접 초기화할 필요가 없습니다. 새 기능·버그 수정 시 [AGENTS.md](AGENTS.md)에 따라 테스트를 추가합니다.

### 로컬 API 스모크 확인

새 로컬 DB와 실행 중인 Worker를 대상으로 다음 순서로 확인합니다. 같은 사용자 ID로 재실행하면 이전 문구가 남아 있을 수 있습니다.

```bash
# 정상 경로: 처음에는 { "phrase": null }
curl -i http://localhost:8787/api/phrases/active \
  -H 'X-User-ID: local-docs-user' -H 'X-Client-Timezone: Asia/Seoul'

# 정상 경로: 문구 생성 → 200과 새 id
curl -i -X POST http://localhost:8787/api/phrases \
  -H 'Content-Type: application/json' -H 'X-User-ID: local-docs-user' \
  -d '{"phrase":"오늘도 나의 속도로"}'

# 실패 경로: 사용자 ID 누락 → 400
curl -i http://localhost:8787/api/phrases/active

# 실패 경로: 빈 문구 → 400
curl -i -X POST http://localhost:8787/api/phrases \
  -H 'Content-Type: application/json' -H 'X-User-ID: local-docs-user' \
  -d '{"phrase":" "}'
```

생성 응답의 `id`로 `/api/phrases/:id/log`에 POST한 뒤 활성 문구의 `logged_today`와 기록 목록을 확인합니다. 같은 시간대·날짜로 두 번 기록해도 `logged_days`가 한 번만 증가해야 합니다. 같은 원본 `id`의 `/replace`에 `{ "phrase": "다음 문장" }`을 POST하고 동일 요청을 반복해 같은 새 `id`가 반환되는지 확인합니다. 기록 목록에는 종료된 원본과 기존 로그가 남아야 합니다. 같은 원본을 다른 문장으로 다시 교체하면 409여야 합니다. 화면에서는 온보딩, 문구 교체 후 이전 기록 보존, 공유 시트 뒤로가기를 확인합니다.

`automation/ux-check/check.mjs`는 운영 사이트에 접속해 iPhone 13 화면과 오류 로그를 수집하는 관찰 스크립트입니다. 기능 성공·실패를 단언하는 회귀 테스트가 아니며, 일부 선택자·파일명에는 이전 챌린지 흐름이 남아 있습니다. `run.sh`는 Claude CLI 실행과 실제 Discord 게시까지 수행합니다.

## 배포와 모바일

웹은 Cloudflare Pages 프로젝트 `dandani`, API는 Worker `dandani-api`, D1은 `dandani-db`를 사용합니다. 현재 문구 교체 기능의 배포 순서는 다음과 같습니다. 운영 적용 여부는 별도 확인해야 합니다.

1. 대상 DB의 스키마 적용 상태와 `preflight_v260910_active_phrases.sql` 조회 결과를 확인합니다. 중복이 있으면 처리 방침 결정 전 고유 인덱스를 적용하지 않습니다.
2. 미적용된 `schema_v260910_active_phrase_unique.sql` → `schema_v260910_phrase_replacement.sql` 순서로 적용합니다. 컬럼 추가 SQL은 재실행하지 않습니다.
3. `ADMIN_API_TOKEN` 등 필요한 Worker Secret을 등록하고 Worker를 배포합니다.
4. 프론트엔드를 빌드·배포합니다. 새 프론트엔드는 `/replace` API가 필요합니다.

아래는 Cloudflare 인증과 위 준비를 마친 뒤 저장소 루트에서 사용하는 명령입니다.

```bash
# 1. API 배포 (SQL 적용·Secret 등록 후)
npm run deploy:workers

# 2. 웹 빌드·배포
npm run build:frontend
npm exec --workspace=workers -- wrangler pages deploy ../frontend/build --project-name dandani
```

`npm exec --workspace=workers`는 `workers/`에서 실행되므로 빌드 경로는 `../frontend/build`입니다. 운영 웹 주소는 `https://dandani.yetimates.com`, API 기본 주소는 `https://dandani-api.amansman77.workers.dev`입니다. 웹 배포 시 `REACT_APP_API_URL`을 운영 주소로 설정합니다. 로컬의 `.env.local`도 빌드에 영향을 줄 수 있으므로 배포 빌드가 localhost를 참조하지 않는지 확인합니다.

Worker의 `ADMIN_API_TOKEN`, `DISCORD_WEBHOOK_URL`, `NVIDIA_API_KEY`는 `workers/`에서 `npx wrangler secret put <변수명>`으로 등록합니다. API 코드 배포는 D1 SQL을 자동 적용하지 않습니다.

Capacitor는 `frontend/build`를 네이티브 프로젝트로 복사합니다. `frontend/`에서 `npm run cap:ios` 또는 `npm run cap:android`가 웹 빌드·동기화·IDE 열기를 수행합니다. Xcode·Android Studio와 서명 환경은 별도로 준비합니다. 세부 참고 자료는 [MOBILE_APP.md](frontend/MOBILE_APP.md)에 있습니다.

## 변경 시 참고

[AGENTS.md](AGENTS.md)의 작은 변경·관련 파일 전체 읽기·회귀 테스트 원칙을 따릅니다. 화면 스타일은 `theme/tokens.js`를 확인하고, 문구 변경은 API 응답·이벤트·날짜 경계를 함께 검토합니다. 최근 구현의 결정과 배포 제약은 [문구 신뢰성 ADR](docs/adr/0006-phrase-reliability.md)과 [작업 계획](docs/plan/0007-phrase-reliability.md)을 참고합니다. ADR은 사용자 검토 후 Accepted 상태입니다.

`practice-service.js`, `story-service.js`, `challenge-service.js`, `timefold-service.js`는 현재 라우터에서 참조하지 않는 보존 코드입니다. 이전 GET·POST API는 404를 반환합니다. 삭제·복원 결정은 [레거시 백엔드 인벤토리](docs/adr/0005-legacy-backend-inventory.md)를 참고하되, 현재 연결 상태는 코드로 확인합니다. 다른 운영·계획 문서의 이전 챌린지 API 예제를 현재 기능 테스트에 사용하지 않습니다.
