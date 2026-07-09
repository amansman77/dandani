# ADR-0002: 챌린지 상태 정의 (Challenge Status Definition)

## Status
**Accepted** - 2026-01-10

## Context
프런트엔드와 백엔드가 `current` / `completed` / `upcoming` 상태를 사용하지만, 정의·입력·판정 규칙이 흩어져 있다. 모든 챌린지는 선택형 모델(`startedAt` 기반)로 통일되었으며, 일차 계산은 시간대 정책(ADR-0001)에 의존한다. 문서화가 없으면 상태/진행률 표시가 엇갈리거나 기록 필터링 범위가 달라질 수 있다.

## Decision
### 상태 집합 (Canonical Set)
- `current`: 진행 중
- `completed`: 총 일수 소진
- `upcoming`: 시작 전

### 입력 (Inputs)
- `total_days` (>=1)
- `currentDay`: 프런트 `calculateChallengeDay` 또는 백엔드 `/api/practice/today`, `/api/challenges/:id` 계산 결과  
  - 모든 챌린지: 로컬 스토리지 `startedAt` 기준 (요청 시 `X-Started-At` 헤더 필수)  
- 시간대/날짜 정규화는 ADR-0001 규칙을 따른다.

### 판정 규칙 (Rules)
1) `currentDay < 1` → `upcoming`  
2) `1 <= currentDay <= total_days` → `current`  
3) `currentDay > total_days` → `completed`

### 진행률/완료 일수
- 상태 판정과 별개로 완료 일수·진행률은 사용자 피드백(`practice_feedback`)을 집계해 계산한다.
- 모든 챌린지 집계/조회 시 `X-Started-At`를 사용해 해당 시작일 이후 기록만 포함한다.

## Consequences
### Positive
- 프런트/백엔드가 동일한 상태 정의를 공유해 표시 불일치 리스크 감소
- 선택형·일정형 챌린지 모두에 적용 가능한 단일 규칙 확보
- 상태 판정과 진행률 산정이 분리되어 디버깅이 용이

### Negative
- `X-Started-At` 헤더 누락 시 400 Bad Request 반환 (명시적 오류)
- `total_days`나 시작 기준이 잘못되면 잘못된 상태를 표시할 수 있음

## Implementation
- 프런트엔드  
  - `frontend/src/utils/challengeDay.js`: `calculateChallengeDay`, `calculateChallengeStatus`로 판정 규칙 구현  
  - `frontend/src/App.js`, `frontend/src/components/ChallengeDetail.js`: 계산된 상태 표시  
  - API 호출 시 `X-Started-At` 헤더 필수 (챌린지 관련 모든 요청)
- 백엔드  
  - `workers/src/index.js`: `/api/practice/today`, `/api/challenges`, `/api/challenges/:id`에서 동일 규칙으로 일차·상태 계산  
  - 기록 조회 시 `X-Started-At`로 챌린지 기록 범위 제한
  - `start_date`/`end_date` 필드는 더 이상 사용하지 않으며, 응답에서 제외

## References
- ADR-0001: 시간대 관리 정책 (Timezone Management Policy)
- ADR-0003: 챌린지 모델 통일 (Challenge Model Unification)
- `frontend/src/utils/challengeDay.js`
- `workers/src/index.js`
