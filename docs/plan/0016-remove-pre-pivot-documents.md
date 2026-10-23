# Problem 1-Pager: 피벗 이전 제품만 설명하는 문서 제거

## Context

plan 0009(2026-09-12)에서 현재 구조처럼 보이는 최상위 문서를 지웠다. 그때 ADR, 실험, 과거
계획은 역사 자료로 남겼다. 그 뒤 기준 문서가 누브·엽서까지 다루게 됐고(plan 0015),
레거시 백엔드는 ADR-0005가 인벤토리로 관리한다.

## Problem

남은 문서 가운데 일부는 이미 없어진 챌린지·Story Feed 제품만 설명한다. 현재 문서와 코드
어디에서도 이 문서들을 참조하지 않는다. 에이전트가 `docs/`를 훑으면 이 문서들이
Accepted ADR, CHANGELOG, 설정 점검 보고서 같은 권위 있는 이름으로 먼저 보인다.
`docs/archive/README.md`는 이미 지운 폴더 구성까지 설명하고 있었다.

## Goal

- 현재 제품 이해에 쓰이지 않고, 그 내용을 대신하는 현재 문서가 있는 문서를 지운다.
- 남은 문서의 목록과 링크를 실제 파일과 맞춘다.

## Non-Goals

- `docs/archive/experiments/`: `docs/experiments/README.md`의 광고 실험 기록이 근거로 인용한다.
- ADR-0001: 기준 문서가 날짜 처리 원칙으로 참조한다. 예시는 챌린지 시절 것이다.
- `docs/plan/`: 이 저장소가 Problem 1-Pager를 남기는 자리이고, 짧고 결정 이유가 담겨 있다.
- `frontend/MOBILE_APP.md`: 네이티브 앱을 다시 빌드할 때 쓰는 실제 절차다.
- `workers/schemas/`의 주석: 마이그레이션 파일은 고치지 않는다.

## Options

1. 문서 상단에 Superseded 표시만 단다: 원문이 가까이 남지만, 검색과 컨텍스트에서 계속 잡음이 된다.
2. 지우고, 지웠다는 사실을 해당 목록 문서에 한 줄로 남긴다: 원문은 Git 이력에서 봐야 한다.

**Decision:** 2번을 선택한다. plan 0009와 같은 기준이다.

## Deletion Inventory

| 문서 | 삭제 이유 | 대체 기준 |
|---|---|---|
| `CHANGELOG.md` | 2025-12-05(챌린지 v0.18)에서 멈췄고 지금 기능은 하나도 없음 | Git 이력, `docs/PROJECT_CONTEXT.md` |
| `docs/posthog-setup-audit.md` | 2025-01 점검. 지금 없는 컴포넌트·이벤트를 정상으로 보고 | ADR-0004, `frontend/src/utils/analytics*.js` |
| `docs/adr/0002-challenge-status-definition.md` | 챌린지 상태 정의 | ADR-0005 |
| `docs/adr/0002.01-challenge-status-definition.md.md` | 위 ADR의 개정본(확장자도 중복) | ADR-0005 |
| `docs/adr/0003-challenge-model-unification.md` | 챌린지 `X-Started-At` 모델 | ADR-0005 |
| `docs/adr/ADR-PROD-011-story-feed-platform.md` | 상태가 "제안"인 채로 2026-08-28 피벗에 대체됨 | ADR-0005, `docs/PROJECT_CONTEXT.md` |
| `docs/archive/plans/` (10개) | 챌린지 시절 구현 계획. 밖에서 참조 없음 | Git 이력 |
| `docs/archive/design-prototypes/` (2개) | 챌린지·실천 카드 HTML | Git 이력 |

## Impact Note

런타임, 빌드, 배포 결과는 바뀌지 않는다. `docs/adr/README.md`에 빠져 있던 ADR-0006 항목도
함께 추가한다.
