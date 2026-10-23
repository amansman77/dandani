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

### 0004: 단단이 UTM 표준 및 PostHog 저장 전략
**Status**: Accepted (2026-01-21)

유입 경로 추적을 위한 `utm_source`/`utm_medium`/`utm_campaign` 표준과, PostHog Person 속성에 최초 1회(`first_utm_*`)만 저장하는 전략을 정의합니다.

[상세 내용](./0004-utm-standard-and-posthog-person-properties.md)

### 0005: 피벗 이후 남은 백엔드/D1 자산 — 삭제 대신 문서화
**Status**: Accepted (2026-09-06)

2026-08-28 단일 문장 되새기기로 피벗한 뒤 남은 Story Feed/Challenge 시절 백엔드 코드와 D1 테이블을, 프론트엔드처럼 삭제하지 않고 인벤토리로 문서화하기로 한 결정입니다. 살아있는 API·크론·테이블과 죽은 것들을 행 수까지 포함해 구분하고, 나중에 실제로 지울 때의 순서를 정리했습니다.

[상세 내용](./0005-legacy-backend-inventory.md)

### 0006: 문장 교체·날짜·운영 API 경계
**Status**: Accepted (2026-09-11)

문장 교체를 한 번의 요청으로 원자적으로 처리하고, 되새기기 날짜를 서버 시각과 사용자 시간대로 판정하며, 운영 API를 관리자 토큰 뒤에 두기로 한 결정입니다.

[상세 내용](./0006-phrase-reliability.md)

챌린지 상태(0002, 0002-01), 챌린지 모델 통일(0003), Story Feed(ADR-PROD-011) 결정은 해당 제품이
없어져 2026-10-23에 삭제했습니다. 남은 레거시 코드와 테이블은 ADR-0005가 다루고, 원문은 Git 이력에
있습니다.

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
