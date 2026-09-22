# 일정형 챌린지 제거 작업 - API 계약 정의

작성일: 2026-01-10

## 단일 모델 정의

### 기준 모델
- **선택형 챌린지**: `startedAt` + `challengeId` 기반
- 모든 챌린지는 사용자가 선택한 시점(`startedAt`)부터 시작
- 일정형 챌린지(`start_date`/`end_date`) 제거

## API 계약

### 필수 헤더
모든 챌린지 관련 API 요청은 다음 헤더를 포함해야 합니다:

```
X-Started-At: <ISO 8601 형식의 시작일시>
X-User-ID: <사용자 ID>
X-Client-Timezone: <클라이언트 시간대>
X-Client-Time: <클라이언트 현재 시간 (ISO 8601)>
```

### X-Started-At 미제공 시 폴백 규칙

**결정: 에러 반환 (400 Bad Request)**

이유:
1. 명시적 오류가 암묵적 동작보다 안전함
2. 클라이언트에서 `startedAt`을 보장하는 것이 더 명확함
3. 디버깅이 용이함

**예외 케이스:**
- `/api/challenges` (목록 조회): `X-Started-At` 선택사항
  - 목록 조회는 챌린지 선택 전이므로 `startedAt`이 없을 수 있음
  - 단, 개별 챌린지 상세 조회 시에는 필수

### API 엔드포인트별 계약

#### 1. GET /api/practice/today
**요구사항:**
- `challengeId` 쿼리 파라미터 필수
- `startedAt` 쿼리 파라미터 또는 `X-Started-At` 헤더 필수
- 미제공 시: `400 Bad Request` 반환

**응답:**
- `start_date`/`end_date` 필드 제거
- `day`: 현재 일차 (startedAt 기준)

#### 2. GET /api/challenges
**요구사항:**
- `X-Started-At` 헤더 선택사항 (목록 조회이므로)
- 단, 각 챌린지의 상태 계산 시 `startedAt`이 없으면 `upcoming`으로 처리

**응답:**
- `start_date`/`end_date` 필드 제거
- `current`/`completed`/`upcoming` 상태는 사용자별 `startedAt` 기준으로 계산 불가하므로 제거
- 대신 모든 챌린지를 단일 배열로 반환 (선택 가능한 챌린지 목록)

#### 3. GET /api/challenges/:id
**요구사항:**
- `X-Started-At` 헤더 필수
- 미제공 시: `400 Bad Request` 반환

**응답:**
- `start_date`/`end_date` 필드 제거
- `status`: `startedAt` 기준으로 계산
- `current_day`: `startedAt` 기준으로 계산

#### 4. POST /api/feedback/record
**요구사항:**
- `X-Started-At` 헤더 필수
- 미제공 시: `400 Bad Request` 반환

#### 5. GET /api/feedback/history
**요구사항:**
- `X-Started-At` 헤더 필수
- `startedAt` 이후의 기록만 반환

## 데이터 마이그레이션 전략

### 기존 데이터 처리

**방침: 단계적 마이그레이션**

1. **기존 사용자 기록 처리**
   - `practice_feedback` 테이블의 기존 기록은 그대로 유지
   - 새로운 기록부터는 `X-Started-At` 필수
   - 기존 기록 조회 시: 첫 기록의 `created_at`을 `startedAt`으로 간주

2. **일정형 챌린지 처리**
   - 기존 일정형 챌린지는 "완료" 상태로 마킹
   - 새로운 챌린지는 일정형 필드 없이 생성
   - DB 스키마는 즉시 변경하지 않고, 코드에서 무시

### DB 스키마 변경 전략

**결정: 단계적으로 deprecate**

1. **1단계 (현재)**: 코드에서 `start_date`/`end_date` 사용 중단
2. **2단계 (향후)**: 스키마에 `deprecated` 주석 추가
3. **3단계 (향후)**: 기존 데이터 마이그레이션 후 컬럼 제거

이유:
- 기존 데이터 보존
- 롤백 가능성 유지
- 점진적 전환

## 클라이언트 요구사항

### 챌린지 선택 플로우 강제

1. **챌린지 미선택 시**
   - 챌린지 선택 화면만 노출
   - 다른 기능 접근 불가

2. **챌린지 선택 시**
   - `startedAt` = 현재 시각 (자정 기준)
   - 로컬 스토리지에 저장
   - 모든 API 요청에 `X-Started-At` 헤더 포함

3. **UI 변경**
   - `start_date`/`end_date` 표시 제거
   - 대신 "N일 챌린지" 또는 "시작일: YYYY-MM-DD" 표시

## 상태 계산 규칙 (ADR-0002 유지)

### 일차 계산
- `currentDay = floor((today - startedAt) / MS_PER_DAY) + 1`
- `1 <= currentDay <= totalDays` → `current`
- `currentDay > totalDays` → `completed`
- `currentDay < 1` → `upcoming` (발생 불가, 하지만 방어적 처리)

### 진행률 계산
- 상태 판정과 별개로 완료 일수는 `practice_feedback` 집계
- `progressPercentage = (completedDays / totalDays) * 100`

## 마이그레이션 체크리스트

- [ ] 백엔드: `start_date`/`end_date` 기반 분기 제거
- [ ] 백엔드: `X-Started-At` 헤더 검증 추가
- [ ] 백엔드: API 응답에서 `start_date`/`end_date` 제거
- [ ] 프론트엔드: 일정형 분기 제거
- [ ] 프론트엔드: 챌린지 선택 플로우 강제
- [ ] 프론트엔드: UI에서 날짜 범위 표시 제거
- [ ] 테스트: 단위/통합 테스트 작성
- [ ] 문서: ADR 및 개발 문서 업데이트
