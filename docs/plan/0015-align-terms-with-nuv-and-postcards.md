# Problem 1-Pager: 누브·엽서 이후의 용어와 코드 경계 정리

## Context

2026-09-12에 현재 제품 기준 문서와 표준 용어(`docs/PROJECT_CONTEXT.md`)를 만들었다
(plan 0007, 0010). 그 뒤 누브, 누브 장부와 봉인, 엽서와 엽서함, 작심삼일, 이겨낸 아침이
추가됐고, 엽서는 2026-09-23 실천 기록에서 나오다가 09-28부터 문장에서 바로 나온다.

## Problem

- 기준 문서의 화면·API·용어 목록이 문장 되새기기까지만 다룬다. AI 에이전트가 기준 문서만
  읽으면 누브·엽서 코드를 문서에 없는 기능, 곧 레거시로 오해할 수 있다.
- 기준 문서는 `practice`를 레거시 용어로 정의하는데, 활성 코드에 `practice-service.js`,
  `practiceDate.js`, `practicedOn`이 남아 있다. 이 중 `practicedOn`은 실제로 엽서 발행일이다.
- `digital_postcards.visit_days`는 방문 일수가 아니라 발행 때의 누브를 담는다. 표준 용어의
  `방문 일수(visit days)`와 이름이 같다.
- 같은 행동을 `log`와 `reflection`이 함께 가리키고, 같은 일을 봉인·도장·stamp·anchor가
  함께 가리킨다.
- `nuv-service.js`가 300 LOC 제한을 넘고, 작심삼일 판정이 그 안에 묻혀 있다. 함수 설명
  주석 두 개가 다른 함수 위에 붙어 있다.
- 프런트엔드 `analytics.js`에 부르는 곳이 없는 챌린지·실천·AI 상담·timefold 로거가 남아 있다.

## Goal

- 기준 문서만 읽고도 누브·엽서·작심삼일의 화면, API, 파일, 용어를 찾을 수 있게 한다.
- 이름과 뜻이 다른 계약 식별자를 한곳에 적는다.
- 활성 코드의 내부 이름과 주석이 표준 용어를 따르게 한다.

## Non-Goals

- API 필드, D1 열, 분석 이벤트 이름 변경(`practiced_on`, `visit_days`, `practice_*`, `daily_reflection`)
- `/api/practices`, `/api/nuv/welcome` 호환 경로 제거
- 사용자에게 보이는 문구 변경
- `workers/tests/` Miniflare 런타임 수리(KNOWN_PITFALLS 11번으로 기록만 한다)

## Constraints

- 이미 설치된 iOS 앱이 옛 경로와 필드를 계속 부른다.
- 분석 이벤트 허용 목록은 D1 CHECK 제약과 함께 움직여야 한다.
- 이유를 설명하는 기존 주석은 내용을 지우지 않는다. 지금 동작과 어긋난 문장만 고친다.

## Options

1. 계약 식별자까지 표준 용어로 바꾼다(`practiced_on` → `issued_on` 열 등): 이름과 뜻이
   맞지만 D1 마이그레이션, 옛 앱 호환, 봉인된 엽서 지문(`postcardContentHash`)의 재현성을
   함께 다뤄야 한다.
2. 계약은 그대로 두고 기준 문서에 대응표를 적으며, 내부 이름·파일 경계·주석만 맞춘다:
   어긋난 이름은 남지만 런타임 동작과 저장 형식이 바뀌지 않는다.

**Decision:** 2번을 선택한다. plan 0010의 "계약 용어 유지" 결정과 같은 원칙이다.

## Changes

- `docs/PROJECT_CONTEXT.md`: 사용자 흐름, 화면 표, 문장·누브·엽서 용어표, "이름과 뜻이 다른
  식별자" 표, 두 날짜 기준, 활성 파일과 API, `practice`의 두 의미를 적는다.
- `AGENTS.md`, `README.md`: 누브·엽서를 현재 도메인으로 안내한다.
- `workers/src/beat-three-days.js`: 연속 일수와 작심삼일 판정을 `nuv-service.js`에서 옮긴다.
- `workers/src/nuv-service.js`: `getBalance` 별칭을 없애고, 다른 함수 위에 있던 주석을 제자리로
  옮긴다. 지금 동작과 어긋난 문장("엽서를 여는 건 실천")을 고친다.
- `frontend/src/utils/practiceDate.js` → `postcardDate.js`
  (`formatPracticedOn` → `formatPostcardDay`, `proofCaption` → `postcardCaption`),
  `practicedOn` prop → `issuedOn`(엽서 만들기 응답의 `issued_on`과 같은 이름).
- `frontend/src/utils/analytics.js`: 부르는 곳이 없는 레거시 로거와 쓰지 않는 default export를 없앤다.

## Impact Note

요청·응답, D1 쓰기, 분석 이벤트 전송은 그대로다. 옮긴 함수의 export 이름과 동작도 그대로이며,
`awardNuvForReflection`의 `timezone` 기본값만 `undefined`에서 `null`로 바뀐다. 둘 다
`normalizeTimezone`에서 UTC가 되므로 결과는 같고, `typecheck:workers`의 TS2525를 해소한다.

## Assumptions

- `frontend/src`와 `automation/`에서 이름을 찾지 못한 로거는 부르는 곳이 없다고 본다.
  프런트엔드는 번들 앱이라 바깥에서 이 모듈을 import하지 않는다.
- 지금 앱은 `/api/practices`를 부르지 않는다(`frontend/src` 검색 기준). 남은 호출은 옛 설치본이다.
