# Problem 1-Pager: 낡은 용어와 겹치는 용어 제거

## Context

plan 0015에서 표준 용어를 누브·엽서까지 넓혔고, plan 0016에서 피벗 이전 문서를 지웠다.
그래도 활성 코드와 자동화에는 두 종류의 용어가 남아 있었다.

## Problem

1. **AI가 읽는 제품 설명이 피벗 이전 그대로였다.**
   - 매일 Discord 인사이트를 쓰는 LLM 프롬프트(`insight-service.js`)는 단단이를
     "습관/챌린지 동반자 앱"으로 소개했다.
   - UX 관찰 에이전트(`automation/ux-check/run.sh`)도 같은 소개를 받았다. 게다가 지금은 없는
     "챌린지 도우미" 탭의 스크린샷을 보라고 지시받았다.
   - `check.mjs`는 스플래시가 걷히기 전에 버튼을 찾았다. 그래서 오늘·기록 화면 스크린샷이
     전부 온보딩 화면으로 찍혔다.
2. **활성 경로에 챌린지 용어가 남아 있었다.**
   - `core.js`가 챌린지 일차 계산(`calculateChallengeDayFromStart`)을 export했다.
   - 관리자 활동 지표는 늘 0인 `practice_users`·`feedback_users`·`ai_chat_users`를 돌려줬다.
   - 프런트엔드에 보내는 곳 없는 챌린지 이벤트 별칭과 PostHog 매핑이 남아 있었다.
3. **한 개념에 여러 이름이 붙어 있었다.**
   - 봉인 / 도장 / stamp
   - 누브 수 / 지갑 / 잔액
   - 되새기기 / `log` / `reflection`
   - "도장 지갑"의 "지갑"은 체인 수수료를 내는 진짜 지갑이었다. 반면 `nuv_wallets`의
     "지갑"은 누브 합계를 담은 테이블이었다. 같은 낱말이 서로 다른 것을 가리켰다.

## Goal

- AI가 읽는 제품 설명과 화면 이름을 지금 앱에 맞춘다.
- 한 개념에 코드 이름 하나, 한국어 이름 하나만 남긴다.

## Non-Goals

- D1 테이블·열·값과 API 필드 이름 변경(`nuv_wallets`, `balance`, `daily_reflection`, `nuv_anchors`)
- 분석 이벤트 허용 목록 변경. D1 CHECK 제약과 함께 움직여야 한다.
- `workers/src/legacy/` 동작 변경(import 경로만 바뀐다)
- 지난 계획서(0007~0016)의 당시 표현

## Options

1. 낡은 이름을 표준 용어표에 동의어로 계속 적어 둔다: 코드는 그대로지만 읽는 쪽이 매번 대응표를 거쳐야 한다.
2. 계약이 아닌 이름은 표준 하나로 바꾸고, 계약 이름만 대응표에 남긴다: 이름 변경이 여러 파일에 걸치지만
   검색 한 번에 한 개념이 잡힌다.

**Decision:** 2번을 선택한다.

## Changes

| 전 | 후 |
|---|---|
| 인사이트·UX 관찰 프롬프트의 "습관/챌린지 동반자 앱" | 문장 되새기기·누브·엽서 소개 |
| `check.mjs` 스크린샷 `2-after-challenge-select`, `3-tab-N` | `2-today`, `3-history`, `4-postcards`. 온보딩 통과·`ko-KR` 지정 |
| `core.js`의 `getClientLocalDate`, `calculateChallengeDayFromStart` | `legacy/challenge-dates.js` |
| 활동 지표 `practice_users`, `feedback_users`, `ai_chat_users` | `phrases_started`, `phrases_logged_users`(일일 보고서와 같은 이름) |
| `stampLedger`, `formatStampMessage`, 주석·Discord 제목의 "도장" | `sealLedger`, `formatSealMessage`, "봉인" |
| "도장 지갑", plan 0014 파일명 `…stamping-wallet` | "체인 기록 지갑", `…anchor-wallet` |
| `getNuvWallet`, `initializeNuvWallet` | `getNuvTotal`, `loadNuvBalance` |
| `awardNuvForReflection`, `REFLECTION_REWARD`, `reflectedDays` | `awardNuvForLog`, `NUV_PER_LOGGED_DAY`, `serverLoggedDays` |

## Impact Note

사용자 화면과 공개 API는 그대로다. 아래 셋은 바뀐다.

- 관리자 `GET /api/analytics/activity`의 일별 열 이름이 바뀐다. 저장소 안에서 이 열을 읽는 곳은 없다.
- 인사이트 Discord 메시지의 내용이 새 제품 소개를 따른다. 봉인 Discord 메시지 제목은
  "누브 장부 봉인"이 된다.
- UX 관찰 스크린샷 파일명이 바뀐다. 이 파일을 쓰는 곳은 같은 폴더의 `run.sh`뿐이다.
  `run.sh`는 저장소 밖 일정으로 실행되므로, 실행하는 체크아웃이 이 커밋을 받아야 반영된다.

## Assumptions

- UX 관찰은 운영 사이트에서 실행해 확인하지 않았다. 운영에 신규 방문 기록이 남기 때문이다.
  대신 API를 막은 로컬 화면으로 오늘·기록·엽서 스크린샷이 찍히는지 확인했다.
