# 단단이 프로젝트 컨텍스트

이 문서는 AI 에이전트와 새 기여자가 **현재 제품**을 먼저 이해하기 위한 기준 문서다.
과거 설계의 이유는 ADR에서 확인하되, 기능의 현재 상태는 실행 코드와 이 문서를 우선한다.
개발 환경과 배포에서 반복된 혼란은 [`KNOWN_PITFALLS.md`](KNOWN_PITFALLS.md)에 정리한다.

## 제품 한 문장

단단이는 사용자가 매일 아침 자신에게 필요한 문장 하나를 되새기며 마음의 중심을
돌보도록 돕는 서비스다.

## 현재 사용자 흐름

1. 사용자는 추천 문장을 고르거나 직접 문장을 작성한다.
2. 선택한 문장은 하나의 **활성 문장**이 된다.
3. 사용자는 하루 한 번 **되새기기**를 남긴다.
4. 지난 문장과 되새긴 날짜는 **문장 기록**에서 확인한다.
5. 활성 문장은 공유하거나 은퇴시키고 다른 문장으로 바꿀 수 있다.

프런트엔드 진입점은 `frontend/src/App.js`이며 현재 화면은 오늘 탭의 `DailyPhrase`와
기록 탭의 `PhraseHistory`다. Worker의 활성 HTTP 경로는 `workers/src/router.js`가
최종 기준이다.

## 표준 용어

새 코드, 주석, 이슈, 문서에서는 아래의 **표준 용어**를 사용한다. 괄호 안은 코드와
API에서 사용하는 영문 표현이다.

| 표준 용어 | 코드/API 용어 | 뜻 | 피할 표현 |
|---|---|---|---|
| 문장 | phrase | 사용자가 반복해서 되새기는 한 문장 | 문구, 미션, 과제 |
| 활성 문장 | active phrase | 사용자가 현재 되새기는 유일한 문장 | 오늘의 챌린지 |
| 되새기기 | phrase log / log | 특정 날짜에 문장을 되새겼다는 기록 | 실천 완료, 출석 |
| 문장 기록 | phrase history | 활성·은퇴 문장과 되새긴 날짜의 이력 | 챌린지 기록 |
| 문장 시작 | phrase start | 새 문장을 활성 문장으로 등록하는 행위 | 챌린지 시작 |
| 문장 은퇴 | phrase retire | 활성 문장의 사용을 끝내는 행위 | 삭제, 포기 |
| 다른 사람들의 아침 | community phrases | 다른 사용자의 활성 문장을 익명으로 보여주는 영역 | 커뮤니티 피드 |
| 방문 일수 | visit days | 활성 문장을 시작한 뒤 앱을 방문한 서로 다른 날짜 수 | 연속 일수 |
| 되새긴 일수 | logged days | 해당 문장에 되새기기를 남긴 날짜 수 | 방문 일수 |

`phrase`, `log`, `retire` 같은 공개 API·DB 식별자는 위 의미로 해석한다. 기존 식별자를
한국어 표준 용어에 맞추기 위한 대규모 이름 변경은 하지 않는다.

## 현재 시스템 경계

### 활성 제품 코드

- `frontend/src/App.js`: 탭, 온보딩, 공유 등 앱 조합
- `frontend/src/components/DailyPhrase.js`: 활성 문장 조회·시작·되새기기·은퇴
- `frontend/src/components/PhraseHistory.js`: 문장 기록
- `frontend/src/utils/phrasePool.js`: 추천 및 다른 사용자의 문장 조회
- `workers/src/router.js`: 활성 API 라우팅
- `workers/src/phrase-service.js`: 문장과 되새기기 저장/조회
- `workers/src/core.js`, `analytics-service.js`: 이벤트와 운영 지표

### 활성 문장 API

| 메서드와 경로 | 역할 |
|---|---|
| `GET /api/phrases/active` | 활성 문장과 되새김 상태 조회 |
| `GET /api/phrases/history` | 문장 기록 조회 |
| `GET /api/phrases/community` | 다른 사용자의 활성 문장 조회 |
| `POST /api/phrases` | 문장 시작 |
| `POST /api/phrases/:id/log` | 오늘의 되새기기 기록 |
| `POST /api/phrases/:id/retire` | 활성 문장 은퇴 |

모든 사용자별 요청은 `X-User-ID`를 사용한다. 날짜 판정이 필요한 요청은
`X-Client-Time`과 `X-Client-Timezone`을 함께 사용하며, 로컬 날짜 처리 원칙은
`docs/adr/0001-timezone-management-policy.md`를 따른다.

## 레거시 경계

`challenge`, `practice`, `story`, `story try`, `timefold`는 현재 제품 용어가 아니다.
관련 Worker 서비스는 `workers/src/legacy/`에, D1 데이터는 원래 테이블에 복구 및 콘텐츠
참고를 위해 보존된 **레거시 자산**이다.
새 기능에서 이 코드에 연결하거나 해당 용어를 재사용하지 않는다. 전체 상태와 예외는
`docs/adr/0005-legacy-backend-inventory.md`를 확인한다.

과거 ADR, 실험, 계획 문서는 당시 맥락을 보존하므로 옛 용어가 등장할 수 있다. 과거 문서와
현재 구현이 충돌하면 다음 순서로 판단한다.

1. `frontend/src/index.js`에서 시작하는 실제 import 경로
2. `workers/src/router.js`에 등록된 실제 라우트
3. 이 문서
4. Accepted ADR(특히 ADR-0001, ADR-0005)
5. `docs/archive/`의 과거 계획, 실험 및 프로토타입

## 변경 전 체크리스트

- 바꾸려는 기능이 활성 경로인지 레거시인지 먼저 확인한다.
- 사용자에게 보이는 한국어는 표준 용어를 사용한다.
- `방문 일수`와 `되새긴 일수`를 서로 대체하지 않는다.
- 문장 이벤트를 추가하면 프런트엔드와 Worker의 이벤트 허용 목록을 함께 확인한다.
- 날짜 로직은 사용자의 시간대와 자정 경계를 포함해 검증한다.
- 수동 Discord 발송 API는 조회가 아니라 외부 전송을 일으키므로 진단 목적으로 호출하지 않는다.
- 변경 완료 전 루트에서 `npm run check`를 실행한다.
