# Problem 1-Pager: 폴더·파일 이름이 역할을 말하게 하기

## Context

2026-10-23 폴더 구조 점검에서, 큰 경계(앱 / API / 문서 / 자동화, `workers/src/legacy/`)는
분명하다는 결론이 나왔다. 그 안에서는 파일 이름이 역할과 다르거나 쓰이지 않는 파일이
활성 파일 옆에 섞여 있었다.

## Problem

- `workers/src/practice-service.js`(옛 앱 호환 경로)와 `workers/src/legacy/practice-service.js`(피벗
  이전 코드)가 같은 이름이다.
- `workers/test/`와 `workers/tests/`가 한 글자 차이로 단위 테스트와 Miniflare 통합 테스트를 나눈다.
- `service-utils.js`는 `core.js`를 다시 내보내기만 한다. 그래서 같은 함수를 두 경로로 import한다.
- `VariantB.js`, `VariantC.js`, `scripts/resize-images.js`는 아무도 쓰지 않는다.
- `frontend/package.json`의 `android:clean`은 없는 파일을 가리킨다.
- 지금 아이콘을 만든 `make-icons.js`가 스크립트에 등록돼 있지 않다.
- `frontend/MOBILE_APP.md`를 링크하는 곳이 없고, 계획서 번호 0007을 두 파일이 쓴다.

## Goal

파일 이름과 위치만 보고 활성·호환·레거시·테스트 종류를 가를 수 있게 한다. 동작은 바꾸지 않는다.

## Non-Goals

- 프런트엔드 API 호출 모으기와 `utils/` 재편(import가 많이 바뀌어 따로 한다)
- e2e 스모크 테스트를 `automation/ux-check/` 밖으로 옮기기
- Android 아이콘 다시 만들기(앱 자산이 바뀐다)
- `privacy.html`과 `privacy/index.html` 중복 정리(앱 스토어에 등록된 URL일 수 있다)

## Options

1. 기준 문서에 "이 파일은 이런 뜻"을 더 적는다: 파일은 그대로지만 에이전트가 문서를 먼저 읽어야 한다.
2. 이름을 바꾸고 쓰지 않는 파일을 지운다: 참조를 함께 고쳐야 하지만 파일 목록만 봐도 구분된다.

**Decision:** 2번을 선택한다.

## Changes

| 전 | 후 |
|---|---|
| `workers/src/practice-service.js` | `workers/src/practice-records-compat.js` |
| `workers/test/*` | `workers/test/unit/*` |
| `workers/tests/*` | `workers/test/integration/*` |
| `workers/src/service-utils.js` | 삭제. `core.js`에서 직접 import |
| `VariantB.js`, `VariantC.js`, `scripts/resize-images.js` | 삭제 |
| `android:clean` 스크립트 | 삭제 |
| — | `icons:make` 스크립트. 아이콘 만드는 법을 `MOBILE_APP.md`에 기록 |
| `docs/plan/0007-phrase-reliability.md` | `0006-phrase-reliability.md`(작성일 09-11이 0007보다 앞선다) |
| README 문서 안내 | `frontend/MOBILE_APP.md` 링크 추가 |

## Impact Note

런타임 번들, API, 화면은 같다. Worker 테스트는 이동 전후 모두 83개가 통과한다.

## Assumptions

- `generate-icons.js`는 처음 점검 때 "쓰이지 않는 옛 스크립트"로 보고 지우려 했다. 확인해 보니
  Android 아이콘을 만드는 유일한 스크립트여서 이 단계에서는 남겼다. 이후 plan 0019에서 Android
  단계를 `make-icons.js`로 옮기고 지웠다.
- 계획서 번호 0006은 2026-10-23에 지운 `docs/archive/plans/0006-…`과 겹친다. 원래 하나의 연번이
  아니었고 파일 이름이 달라서 검색에는 섞이지 않는다.
