# Architecture Decision Records (ADR)

이 디렉토리는 단단이 프로젝트의 중요한 아키텍처 결정을 기록합니다.

## 목적

ADR은 다음과 같은 목적으로 작성됩니다:
- 중요한 기술적 결정의 배경과 이유를 문서화
- 향후 유사한 결정 시 참고 자료로 활용
- 팀 내 의사소통 및 지식 공유
- 시간이 지나도 결정의 맥락을 이해할 수 있도록 보존

## ADR 목록

### 0001: 시간대 관리 정책 (Timezone Management Policy)
**Status**: Accepted (2025-12-05)

서버는 UTC 기준으로 처리하되, 클라이언트에서 로컬 시간 기준으로 전환하는 시간대 관리 정책을 정의합니다.

- 날짜 비교는 자정 기준 (날짜만 비교)
- `startedAt` 필터링 시 로컬 시간대 고려
- 챌린지 일차 계산은 로컬 시간 기준

[상세 내용](./0001-timezone-management-policy.md)

### 0002: 챌린지 상태 정의 (Challenge Status Definition)
**Status**: Accepted (2026-01-10)

`current` / `completed` / `upcoming` 상태 집합과 판정 규칙을 정의하고, 모든 챌린지에 적용되는 일차/진행률 계산 기준을 문서화합니다.

[상세 내용](./0002-challenge-status-definition.md)

### 0003: 챌린지 모델 통일 (Challenge Model Unification)
**Status**: Accepted (2026-01-10)

일정형 챌린지(`start_date`/`end_date`)를 제거하고 모든 챌린지를 선택형 모델(`startedAt` 기반)로 통일한 결정입니다. X-Started-At 헤더 필수 요구사항, 기존 데이터 처리 전략, DB 스키마 변경 전략을 포함합니다.

[상세 내용](./0003-challenge-model-unification.md)

## ADR 작성 가이드

새로운 ADR을 작성할 때는 다음 템플릿을 사용하세요:

```markdown
# ADR-XXXX: [제목]

## Status
[Proposed | Accepted | Rejected | Deprecated | Superseded]

## Context
[배경 및 문제 상황]

## Decision
[결정 사항]

## Consequences
[긍정적/부정적 결과]

## Implementation
[구현 세부사항]

## References
[관련 문서, 이슈, 논의 링크]
```

## ADR 상태

- **Proposed**: 제안된 상태, 아직 결정되지 않음
- **Accepted**: 채택됨, 구현 중 또는 구현 완료
- **Rejected**: 거부됨, 다른 방법 선택
- **Deprecated**: 더 이상 사용하지 않음, 대체 방법 존재
- **Superseded**: 다른 ADR로 대체됨

## 참고

- ADR은 변경 가능합니다. 중요한 변경 시 상태를 업데이트하세요.
- 관련 코드에 ADR 참조를 추가하는 것을 권장합니다.
- 정기적으로 ADR을 검토하여 현재 상태를 확인하세요.
