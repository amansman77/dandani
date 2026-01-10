# ADR-0003: 챌린지 모델 통일 (Challenge Model Unification)

## Status
**Accepted** - 2026-01-10

## Context
기존에는 일정형 챌린지(`start_date`/`end_date` 기반)와 선택형 챌린지(`startedAt` 기반)가 공존했습니다. 이로 인해 코드 복잡도가 증가하고, 일차 계산 로직이 분산되어 유지보수가 어려웠습니다. 또한 두 모델 간의 일관성 문제가 발생할 수 있었습니다.

## Decision
모든 챌린지를 **선택형 모델(`startedAt` 기반)**로 통일합니다.

### 핵심 원칙
1. **단일 모델**: 모든 챌린지는 사용자가 선택한 시점(`startedAt`)부터 시작
2. **클라이언트 관리**: `startedAt`은 클라이언트의 로컬 스토리지에서 관리
3. **API 계약**: 모든 챌린지 관련 API 요청에 `X-Started-At` 헤더 필수
4. **일정형 제거**: `start_date`/`end_date` 필드는 더 이상 사용하지 않음

### X-Started-At 헤더 필수 요구사항
- **대부분의 API**: `X-Started-At` 헤더 필수, 미제공 시 `400 Bad Request` 반환
- **예외**: `/api/challenges` (목록 조회)는 선택사항
  - 이유: 목록 조회는 챌린지 선택 전이므로 `startedAt`이 없을 수 있음

### 기존 데이터 처리 전략
**단계적 마이그레이션**:
- 기존 기록은 첫 기록의 `created_at`을 `startedAt`으로 간주
- 새로운 기록부터는 `X-Started-At` 필수
- 일정형 챌린지는 "완료" 상태로 마킹

### DB 스키마 변경 전략
**단계적으로 deprecate**:
1. 코드에서 `start_date`/`end_date` 사용 중단 (완료)
2. 스키마에 `deprecated` 주석 추가 (향후)
3. 기존 데이터 마이그레이션 후 컬럼 제거 (향후)

## Consequences
### Positive
- 코드 복잡도 감소: 단일 모델로 통일되어 로직 단순화
- 유지보수성 향상: 일차 계산 로직이 한 곳에 집중
- 일관성 보장: 모든 챌린지가 동일한 방식으로 동작
- 사용자 경험 개선: 사용자가 원하는 시점에 챌린지 시작 가능

### Negative
- 기존 데이터 마이그레이션 필요 (단계적으로 처리)
- 클라이언트에서 `startedAt` 관리 책임 증가
- `X-Started-At` 헤더 누락 시 명시적 오류 반환 (400 Bad Request)

## Implementation
- **프런트엔드**
  - `frontend/src/utils/challengeSelection.js`: `startedAt` 로컬 스토리지 관리
  - 모든 챌린지 관련 API 요청에 `X-Started-At` 헤더 포함
  - 챌린지 선택 시 `startedAt` 자동 설정 및 저장
- **백엔드**
  - `workers/src/index.js`: `start_date`/`end_date` 기반 분기 제거
  - 모든 챌린지 조회 쿼리에서 `start_date`/`end_date` 필드 제외
  - `X-Started-At` 헤더 검증 및 필수 요구사항 적용
- **데이터베이스**
  - `challenges` 테이블의 `start_date`/`end_date` 컬럼은 유지하되 코드에서 사용하지 않음
  - 향후 단계적으로 deprecate 및 제거 예정

## References
- ADR-0001: 시간대 관리 정책 (Timezone Management Policy)
- ADR-0002: 챌린지 상태 정의 (Challenge Status Definition)
- Plan-0001: Remove Schedule-Based Challenges (아카이브됨)
- `frontend/src/utils/challengeSelection.js`
- `workers/src/index.js`
