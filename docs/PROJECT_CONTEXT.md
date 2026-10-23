# 단단이 프로젝트 컨텍스트

이 문서는 AI 에이전트와 새 기여자가 **현재 제품**을 먼저 이해하기 위한 기준 문서다.
과거 설계의 이유는 ADR에서 확인하되, 기능의 현재 상태는 실행 코드와 이 문서를 우선한다.
개발 환경과 배포에서 반복된 혼란은 [`KNOWN_PITFALLS.md`](KNOWN_PITFALLS.md)에 정리한다.

## 제품 한 문장

단단이는 사용자가 매일 아침 자신에게 필요한 문장 하나를 되새기며 마음의 중심을
돌보도록 돕는 서비스다. 되새긴 하루는 **누브**로 남고, 문장은 **엽서**로 옮겨 간직하거나
공유할 수 있다. 핵심 행동은 여전히 되새기기 하나이고, 누브와 엽서는 그 결과물이다.

## 현재 사용자 흐름

1. 사용자는 추천 문장을 고르거나 직접 문장을 작성한다.
2. 선택한 문장은 하나의 **활성 문장**이 된다.
3. 사용자는 하루 한 번 **되새기기**를 남긴다. 그날의 첫 되새기기마다 **누브** 1개가 남는다.
4. 같은 문장을 3일 연속 되새기면 **작심삼일**을 이겨낸 것이 되고, **작심삼일 엽서**를
   발행하고 **이겨낸 아침** 배경을 쓸 수 있다.
5. **엽서 만들기**로 활성 문장을 엽서로 옮기고, 배경을 골라 **엽서함**에 간직하거나
   이미지로 공유한다.
6. 지난 문장과 되새긴 날짜는 **문장 기록**에서, 누브가 남은 날은 **누브 장부**에서 확인한다.
7. 활성 문장은 공유하거나 다른 문장으로 바꿀 수 있다. 바꾸면 이전 문장은 은퇴하고 되새긴
   일수는 새 문장에서 다시 센다. 누브와 이미 발행한 엽서는 그대로 남는다.

프런트엔드는 `frontend/src/index.js`에서 시작해 `frontend/src/App.js`가 화면을 조합한다.

| 자리 | 컴포넌트 |
|---|---|
| 오늘 탭 | `DailyPhrase` (문장 선택·되새기기·엽서 만들기) |
| 기록 탭 | `PhraseHistory` |
| 엽서 탭 | `PostcardHistory` (엽서함) |
| 헤더의 `누브 N` | `NuvLedgerSheet` (누브 장부) |

Worker의 활성 HTTP 경로는 `workers/src/router.js`가 최종 기준이다.

## 표준 용어

새 코드, 주석, 이슈, 문서에서는 아래의 **표준 용어**를 사용한다. 괄호 안은 코드와
API에서 사용하는 영문 표현이다.

### 문장과 되새기기

| 표준 용어 | 코드/API 용어 | 뜻 | 피할 표현 |
|---|---|---|---|
| 문장 | phrase | 사용자가 반복해서 되새기는 한 문장 | 문구, 미션, 과제 |
| 활성 문장 | active phrase | 사용자가 현재 되새기는 유일한 문장 | 오늘의 챌린지 |
| 되새기기 | phrase log / log | 특정 날짜에 문장을 되새겼다는 기록. 화면에서 횟수는 "되새김 N일"로 적는다 | 실천 완료, 출석 |
| 문장 기록 | phrase history | 활성·은퇴 문장과 되새긴 날짜의 이력 | 챌린지 기록 |
| 문장 시작 | phrase start | 새 문장을 활성 문장으로 등록하는 행위 | 챌린지 시작 |
| 문장 바꾸기 | phrase replace | 활성 문장을 은퇴시키고 새 문장을 시작하는 한 번의 요청 | 문장 수정 |
| 문장 은퇴 | phrase retire | 활성 문장의 사용을 끝내는 행위. 지금 앱은 문장 바꾸기 안에서만 은퇴시킨다 | 삭제, 포기 |
| 다른 사람들의 아침 | community phrases | 다른 사용자의 활성 문장을 익명으로 보여주는 영역 | 커뮤니티 피드 |
| 방문 일수 | visit days | 활성 문장을 시작한 뒤 앱을 방문한 서로 다른 날짜 수. 화면에서는 "N번째 아침" | 연속 일수 |
| 되새긴 일수 | logged days | 해당 문장에 되새기기를 남긴 날짜 수 | 방문 일수 |
| 연속 일수 | streak | 오늘(아직이면 어제)에서 끝나는, 한 문장을 끊김 없이 되새긴 날짜 수 | 방문 일수, 되새긴 일수 |
| 작심삼일 | beat_three_days | 같은 문장의 연속 일수가 한 번이라도 3에 닿은 상태. 한 번 이기면 쉬어도 유지된다 | 3일 챌린지 |

### 누브

| 표준 용어 | 코드/API 용어 | 뜻 | 피할 표현 |
|---|---|---|---|
| 누브 | nuv | 되새긴 하루 하나가 남긴 단위. 사람당 하루 1개, 줄어들지 않는다 | 포인트, 코인, 재화 |
| 누브 수 | balance (`nuv_wallets.balance`, API `balance`) | 지금까지 남은 누브의 합. 줄지 않으므로 평생 누적과 같다 | 잔액, 지갑 |
| 누브 장부 | nuv ledger | 누브가 남은 날과 그날 되새긴 문장의 목록 | 지갑 내역 |
| 봉인 | seal (`sealLedger`, `last_sealed_day`) | 매일 00:30 KST 누브·엽서 장부를 머클 루트로 굳히는 일 | 도장, stamp, 체인에 새김(아직 사실 아님) |
| 체인 기록 | anchor (`nuv_anchors`, `NuvLedgerAnchor`) | 봉인 루트를 체인에 올리는 일. 체인 기록 지갑을 기다리는 중이라 지금 상태는 모두 `awaiting_chain` | 도장 지갑 |

### 엽서

| 표준 용어 | 코드/API 용어 | 뜻 | 피할 표현 |
|---|---|---|---|
| 엽서 | postcard (`digital_postcards`) | 문장·날짜·그날까지의 되새긴 일수가 발행 순간에 굳은 한 장 | 카드, 증명서 |
| 엽서 만들기 | `POST /api/nuv/postcards` | 활성 문장을 엽서로 옮기는 일. 같은 문장·같은 날에는 같은 엽서를 돌려준다 | 실천 남기기 |
| 엽서함 | saved postcards | 저장된 엽서 목록(엽서 탭) | 컬렉션 |
| 발행번호 | issue_no | 사람마다 1부터 매기는 "내 몇 번째 엽서" | 전역 번호 |
| 배경 | preset | 엽서 그림의 배경. 발행 뒤에 바꿀 수 있는 유일한 값이다 | 테마, 스킨 |
| 작심삼일 엽서 | kind `beat_three_days` | 작심삼일을 이겨낸 문장마다 한 장 발행되는 특별한 엽서. 배경은 이겨낸 아침으로 고정 | 보상 엽서 |
| 이겨낸 아침 | preset `triumph` | 작심삼일을 한 번이라도 이겨낸 사람에게 열리는 배경 | 프리미엄 배경 |
| 초기 엽서 | `is_legacy` (`issue_no` 없음) | 누브를 주고 샀던 옛 엽서. 봉인에 들어가지 않는다 | — |

`phrase`, `log`, `retire` 같은 공개 API·DB 식별자는 위 의미로 해석한다. 기존 식별자를
한국어 표준 용어에 맞추기 위한 대규모 이름 변경은 하지 않는다.

### 이름과 뜻이 다른 식별자

D1 열과 API 필드는 이미 설치된 앱과 저장된 데이터 때문에 이름을 바꾸지 않았다. 아래 식별자는
이름이 아니라 이 표의 뜻으로 읽는다. 내부 변수와 함수 이름은 표준 용어를 따른다.

| 식별자 | 실제 뜻 |
|---|---|
| `digital_postcards.practiced_on` | 엽서가 가리키는 날. 엽서 만들기 응답에서는 `issued_on`, 프런트엔드 내부에서는 `issuedOn` |
| `digital_postcards.visit_days` | 방문 일수가 **아니다**. 발행 때의 누브(최소 1)이며 화면에서 읽지 않는다. 방문 일수는 `GET /api/phrases/active`의 `visit_days`뿐이다 |
| `practice_records`, `practice_record_id`, `practice_body` | 2026-09-28 이전, 실천을 적어야 엽서가 나오던 시기의 기록. 지금 앱은 만들지 않는다 |
| `nuv_transactions.reason`의 `daily_reflection` | 되새기기로 남은 누브. 코드 식별자는 `log`를 쓴다(`awardNuvForLog`, `serverLoggedDays`) |
| `kind`의 `regular` | 일반 엽서 |

두 날짜 기준도 구분한다. 되새기기의 `log_date`와 화면의 "오늘"은 앱이 보낸 시간대를 따른다.
누브의 하루와 작심삼일 판정은 처음 누브를 받을 때 고정한 시간대(`nuv_accounts.timezone`)로
서버 시각을 읽는다. 헤더만 바꿔 하루에 여러 번 받는 것을 막기 위해서다.

## 현재 시스템 경계

### 활성 제품 코드

- `frontend/src/App.js`: 탭, 온보딩, 공유 등 앱 조합
- `frontend/src/components/DailyPhrase.js`: 활성 문장 조회·시작·되새기기·은퇴·엽서 만들기
- `frontend/src/components/PhraseHistory.js`: 문장 기록
- `frontend/src/components/PostcardHistory.js`, `PhraseCardSheet.js`: 엽서함, 엽서 배경 고르기
- `frontend/src/components/NuvLedgerSheet.js`: 누브 장부
- `frontend/src/utils/phrasePool.js`: 추천 및 다른 사용자의 문장 조회
- `frontend/src/utils/phraseCard.js`, `postcardDate.js`: 엽서 그림과 날짜 표기
- `workers/src/router.js`: 활성 API 라우팅
- `workers/src/phrase-service.js`, `phrase-mutations.js`: 문장과 되새기기 저장/조회
- `workers/src/nuv-service.js`: 누브 원장과 엽서 발행·저장
- `workers/src/beat-three-days.js`: 연속 일수와 작심삼일 판정
- `workers/src/nuv-anchor-service.js`: 매일 밤 누브·엽서 장부 봉인
- `workers/src/practice-service.js`: 옛 앱이 부르는 `/api/practices` 호환 경로
- `workers/src/core.js`, `analytics-service.js`: 이벤트와 운영 지표

Worker 테스트는 두 폴더에 있다. `workers/test/`는 `node:sqlite`로 만든 가짜 D1로 서비스
함수를 직접 부르고, `workers/tests/`는 Miniflare로 Worker 전체를 띄운다.

### 활성 문장 API

| 메서드와 경로 | 역할 |
|---|---|
| `GET /api/phrases/active` | 활성 문장과 되새김 상태 조회 |
| `GET /api/phrases/history` | 문장 기록 조회 |
| `GET /api/phrases/community` | 다른 사용자의 활성 문장 조회 |
| `POST /api/phrases` | 문장 시작 |
| `POST /api/phrases/:id/replace` | 문장 바꾸기 |
| `POST /api/phrases/:id/log` | 오늘의 되새기기 기록, 누브 적립, 작심삼일 상태 반환 |
| `POST /api/phrases/:id/retire` | 활성 문장 은퇴 |

### 활성 누브·엽서 API

| 메서드와 경로 | 역할 |
|---|---|
| `GET /api/nuv` | 누브 수 |
| `GET /api/nuv/ledger` | 누브 장부와 마지막 봉인 날짜 |
| `GET /api/nuv/postcards` | 엽서함 |
| `POST /api/nuv/postcards` | 엽서 만들기 (`kind`: `regular`, `beat_three_days`) |
| `POST /api/nuv/postcards/:id/save` | 엽서 배경 저장 |
| `POST /api/nuv/welcome` | 호환용. 가입 선물은 없어졌고 누브 수만 돌려준다 |
| `GET`·`POST /api/practices` | 호환용. 옛 앱의 실천 기록과 그 엽서 |

모든 사용자별 요청은 `X-User-ID`를 사용한다. 날짜 판정이 필요한 요청은
`X-Client-Time`과 `X-Client-Timezone`을 함께 사용하며, 로컬 날짜 처리 원칙은
`docs/adr/0001-timezone-management-policy.md`를 따른다.

## 레거시 경계

`challenge`, `practice`(실천), `story`, `story try`, `timefold`는 현재 제품 용어가 아니다.
관련 Worker 서비스는 `workers/src/legacy/`에, D1 데이터는 원래 테이블에 복구 및 콘텐츠
참고를 위해 보존된 **레거시 자산**이다.
새 기능에서 이 코드에 연결하거나 해당 용어를 재사용하지 않는다.

`practice`만은 레거시 폴더 밖에도 남아 있다. 피벗 이전 챌린지의 실천(`legacy/practice-service.js`)과
2026-09-23~28 엽서용 실천 기록(`workers/src/practice-service.js`)은 다른 것이고, 뒤의 것은
이미 설치된 앱 때문에 라우터에 남은 호환 경로다. 둘 다 새 기능의 용어로 쓰지 않는다.
분석 이벤트 허용 목록의 `challenge_*`, `practice_*` 이름은 D1 CHECK 제약과 지난 데이터
때문에 남아 있을 뿐, 지금 앱에서 보내는 곳은 없다. 전체 상태와 예외는
`docs/adr/0005-legacy-backend-inventory.md`를 확인한다.

과거 ADR, 실험, 계획 문서는 당시 맥락을 보존하므로 옛 용어가 등장할 수 있다. 과거 문서와
현재 구현이 충돌하면 다음 순서로 판단한다.

1. `frontend/src/index.js`에서 시작하는 실제 import 경로
2. `workers/src/router.js`에 등록된 실제 라우트
3. 이 문서
4. Accepted ADR(특히 ADR-0001, ADR-0005)
5. `docs/archive/`의 과거 실험

## 변경 전 체크리스트

- 바꾸려는 기능이 활성 경로인지 레거시인지 먼저 확인한다.
- 사용자에게 보이는 한국어는 표준 용어를 사용한다.
- `방문 일수`, `되새긴 일수`, `연속 일수`, 누브 수를 서로 대체하지 않는다.
- 엽서에 굳는 값(문장, 날짜, 되새긴 일수, 발행번호)은 발행 뒤에 바꾸지 않는다. 바뀌는 것은 배경뿐이다.
- 문장 이벤트를 추가하면 프런트엔드와 Worker의 이벤트 허용 목록을 함께 확인한다.
- 날짜 로직은 사용자의 시간대와 자정 경계를 포함해 검증한다.
- 수동 Discord 발송 API는 조회가 아니라 외부 전송을 일으키므로 진단 목적으로 호출하지 않는다.
- 변경 완료 전 루트에서 `npm run check`를 실행한다.
