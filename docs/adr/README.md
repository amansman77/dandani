# Architecture Decision Records (ADR)

이 디렉토리는 단단이 프로젝트의 중요한 아키텍처 결정을 기록합니다.

## 목적

ADR은 다음과 같은 목적으로 작성됩니다:
- 중요한 기술적 결정의 배경과 이유를 문서화
- 향후 유사한 결정 시 참고 자료로 활용
- 팀 내 의사소통 및 지식 공유
- 시간이 지나도 결정의 맥락을 이해할 수 있도록 보존

## ADR 목록

### 기획 (PROD)

| ID | 제목 | 상태 |
|----|------|------|
| [ADR-PROD-000](./ADR-PROD-000-dandani-v2-action-personalization-agent.md) | Dandani V2 — Action Personalization Agent | 제안 |
| [ADR-PROD-001](./ADR-PROD-001-action-flow-mvp.md) | Action Flow MVP | 제안 |
| [ADR-PROD-002](./ADR-PROD-002-navigation-structure.md) | Navigation Structure — Action-Centric UI | 제안 |
| [ADR-PROD-003](./ADR-PROD-003-action-taxonomy.md) | Action Taxonomy — 행동 타입 시스템 | 제안 |
| [ADR-PROD-004](./ADR-PROD-004-action-ui-components.md) | Action UI Components | 제안 |
| [ADR-PROD-005](./ADR-PROD-005-emotion-character-state-mapping.md) | Emotion → Character State Mapping | 제안 |
| [ADR-PROD-006](./ADR-PROD-006-character-scene-rendering.md) | Character Scene Rendering | 제안 |

### 기술 (TECH)

| ID | 제목 | 상태 |
|----|------|------|
| [ADR-TECH-001](./ADR-TECH-001-timezone-management-policy.md) | 시간대 관리 정책 (Timezone Management Policy) | Accepted (2025-12-05) |
| [ADR-TECH-002](./ADR-TECH-002-challenge-status-definition.md) | 챌린지 상태 정의 (Challenge Status Definition) | Accepted (2026-01-10) |
| [ADR-TECH-002-01](./ADR-TECH-002-01-challenge-status-definition.md) | 챌린지 상태 정의 Final (Challenge Status Definition – Final) | Accepted (2026-01-18) |
| [ADR-TECH-003](./ADR-TECH-003-challenge-model-unification.md) | 챌린지 모델 통일 (Challenge Model Unification) | Accepted (2026-01-10) |
| [ADR-TECH-004](./ADR-TECH-004-utm-standard-and-posthog-person-properties.md) | UTM 표준 및 PostHog 저장 전략 | Accepted (2026-01-21) |

## ADR 작성 가이드

새로운 ADR을 작성할 때는 다음 템플릿을 사용하세요:

```markdown
# ADR-TECH-000: [제목]

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
