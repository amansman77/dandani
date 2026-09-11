# Problem 1-Pager: AI 에이전트에 혼란을 주는 문서 제거

## Context

현재 제품 기준 문서와 표준 용어를 추가했지만, 저장소 최상위에는 피벗 이전 기능을 현재
구조처럼 설명하거나 프로젝트와 무관한 범용 지침을 담은 문서가 남아 있다.

## Problem

AI 에이전트가 파일명만 보고 `DEVELOPMENT.md`, `INFRASTRUCTURE.md`,
`CODING_STANDARDS.md` 등을 신뢰하면 삭제된 챌린지·AI 상담 기능을 되살리거나 존재하지
않는 인프라를 전제로 작업할 수 있다. `.cursor/rules/background.md`는 해당 문서들을
우선 읽도록 지시해 혼란을 증폭한다.

## Goal

- 현재 프로젝트 이해에 불필요하거나 명백히 잘못된 문서를 제거한다.
- README와 현재 컨텍스트 문서의 링크를 유효하게 유지한다.
- 역사적 결정과 실험 기록, 실제 모바일·배포 절차는 보존한다.

## Non-Goals

- ADR, 실험, 과거 구현 계획의 역사적 용어 삭제
- 런타임 코드나 배포 설정 변경
- 남은 문서의 전면 재작성

## Constraints

- 삭제한 내용은 Git 이력에서 복구할 수 있어야 한다.
- 삭제 전에 문서 전체와 모든 참조를 확인한다.
- 대체 정보가 없는 활성 운영 절차는 삭제하지 않는다.

## Options

1. 모든 후보 문서 상단에 경고를 추가한다: 이력은 가까이 남지만 잘못된 본문이 계속 검색되고
   에이전트 컨텍스트를 소비한다.
2. 정확한 대체 문서가 있는 오해 유발 문서만 삭제한다: Git 이력을 봐야 복구할 수 있지만
   현재 정보의 신호 대 잡음비가 높아진다.

**Decision:** 2번을 선택한다.

## Deletion Inventory

| 문서 | 삭제 이유 | 대체 기준 |
|---|---|---|
| `.cursor/rules/background.md` | 오래된 문서를 우선하도록 하는 중복 지침 | `AGENTS.md` |
| `DEVELOPMENT.md` | 삭제된 화면·API·상태 구조를 현재처럼 설명 | `README.md`, `docs/PROJECT_CONTEXT.md` |
| `INFRASTRUCTURE.md` | 확인되지 않은 R2·Access·CI와 레거시 모델 설명 | 코드 설정, `DEPLOYMENT.md` |
| `CODING_STANDARDS.md` | 프로젝트와 연결되지 않은 범용 문서 일부, 끊어진 링크 | `AGENTS.md`, ESLint 설정 |
| `SLACK_SETUP.md` | Slack/Discord 혼재, 현재 지표·Cron·함수와 불일치 | `DEPLOYMENT.md`, Worker 코드 |

## Impact Note

런타임과 배포 결과는 바뀌지 않는다. AI 에이전트의 기본 진입점은 `AGENTS.md` →
`docs/PROJECT_CONTEXT.md` → 실제 import/route 경로로 단순해진다.
