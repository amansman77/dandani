# Problem 1-Pager: 프런트엔드 호출·도구·Android 아이콘 정리

## Context

2026-10-23 폴더 구조 점검의 남은 항목이다. plan 0018은 이름 변경과 삭제만 다뤘고, import가 여러
곳 바뀌는 프런트엔드 재편과 e2e 분리, Android 아이콘은 이 계획으로 나눴다.

## Problem

- 서버 호출이 `utils/phraseApi.js`·`nuvApi.js`와 컴포넌트 네 곳(`App`, `PhraseHistory`,
  `PostcardHistory`, `PhraseCardSheet`)에 나뉘어 있었다. Worker 주소 상수도 여덟 곳에 따로 있었다.
- `utils/`의 23개 파일에 API, 분석, 공유, 날짜가 섞여 있었다.
- e2e 스모크 테스트가 UX 관찰 도구와 같은 `automation/ux-check/`에 있었다. 점검해 보니 문제가 둘 더 있었다.
  - 바뀐 버튼 문구("내 엽서 문장은 직접 쓸래요") 때문에 `main`에서도 실패하고 있었다.
  - `/api/nuv`·`/api/analytics/event`를 가로채지 않아 운영 Worker로 요청을 보냈다.
- Android 아이콘은 9/25 문양으로 바꿀 때 빠져 2025-12의 캐릭터 그대로였다.
  - 그걸 만들던 `generate-icons.js`는 전경을 투명 배경에 줄이고 크림색 배경을 깔았다.
  - 어두운 문양에 쓰면 크림 테두리 안에 어두운 사각형이 된다.

## Goal

- 서버 호출을 `src/api/` 한 곳에서 찾을 수 있게 한다.
- 폴더 이름만으로 분석·공유 코드를 가를 수 있게 한다.
- e2e 테스트가 지금 화면에서 통과하고, 운영으로 요청이 나가면 실패하게 한다.
- 아이콘을 한 명령으로 모든 플랫폼에 같은 문양으로 만든다.

## Non-Goals

- 오류 문구, 요청 헤더, 화면 동작 변경
- 분석 이벤트 전송을 `api/`로 옮기기(세션 헤더와 실패 처리가 달라 그대로 둔다)

## Options

1. API 클라이언트 하나에 공통 요청 함수를 만들어 모든 호출을 통일한다. 중복은 줄지만 호출마다 다른 오류
   문구·헤더를 한 함수에 옵션으로 몰아넣게 된다.
2. 호출을 `api/`로 옮기기만 하고, 각 호출의 헤더와 오류 처리는 그대로 둔다. 중복은 남지만 동작이 바뀌지 않는다.

**Decision:** 2번을 선택한다. 공통화는 호출이 더 늘어났을 때 판단한다.

## Changes

| 전 | 후 |
|---|---|
| `utils/phraseApi.js`, 컴포넌트의 기록·커뮤니티 조회 | `api/phrases.js` |
| `utils/nuvApi.js`, 컴포넌트의 누브 수·엽서함·배경 저장 | `api/nuv.js` |
| Worker 주소 상수 8곳 | `api/config.js` |
| `utils/analytics*.js`, `posthog-first-utm.js`, `attribution.js`, `utm.js` | `analytics/` |
| `utils/kakaoShare.js`, `shareImageFile.js`, `phraseCard.js` | `share/` |
| `automation/ux-check/smoke.mjs` | `automation/e2e/smoke.mjs`(자체 `package.json`, 같은 Playwright 버전) |
| e2e의 문장 직접 쓰기 버튼, 첫 저장 뒤 공유 시트 확인 | 지금 문구로, 공유 시트 확인은 삭제(첫 저장 뒤 자동으로 열리지 않음) |
| e2e가 가로채는 API | 테스트 전용 주소 + `/api/**` 전부, 운영 요청이 있으면 실패 |
| `generate-icons.js`의 Android 단계 | `make-icons.js`에 Android 단계 추가, `generate-icons.js` 삭제 |

## Impact Note

- 웹 번들은 import 경로만 바뀌고 동작은 같다. 프런트엔드 테스트는 28개에서 33개가 됐다.
- `icons:make`를 다시 돌렸을 때 웹·iOS 아이콘은 바이트 단위로 같았고, Android `mipmap-*`만 문양으로 바뀌었다.
- 설치된 Android 앱에 반영하려면 네이티브 빌드와 배포가 필요하다.

## Assumptions

- Android 적응형 아이콘은 `mipmap-anydpi-v26/ic_launcher.xml`의 16.7% 안쪽 들임을 유지한다고 보고, 원형
  마스크 미리보기로 문양이 잘리지 않는 것만 확인했다. 실제 기기·런처별 모양은 확인하지 않았다.
- CI의 e2e job이 이전에 운영으로 요청을 보낸 횟수는 세지 않았다.
