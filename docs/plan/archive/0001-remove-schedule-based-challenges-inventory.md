# 일정형 챌린지 제거 작업 - 사용처 인벤토리

작성일: 2026-01-10

## 목적
`start_date`/`end_date` 기반 일정형 챌린지 로직의 모든 사용처를 파악하여 제거 작업의 범위를 명확히 합니다.

## 백엔드 사용처 (workers/src/index.js)

### 1. getTodayPractice 함수
- **라인 122-125**: `start_date`/`end_date`로 현재 날짜에 해당하는 챌린지 조회
  ```javascript
  WHERE start_date <= date(?) AND end_date >= date(?)
  ```
- **라인 129-130**: `start_date`/`end_date`로 총 일수 계산
- **라인 150-152**: `start_date` 기준으로 일차 계산 (일정형 챌린지용)

### 2. getChallenges 함수
- **라인 239**: `start_date`로 정렬
  ```javascript
  ORDER BY start_date ASC
  ```
- **라인 249-250**: `start_date`/`end_date`로 총 일수 및 상태 계산
- **라인 254-256**: `start_date` 기준으로 현재 일차 계산
- **라인 282**: `end_date`로 완료 여부 판단
- **라인 306**: `start_date`로 예정 여부 판단
- **라인 268-269, 292-293, 313-314**: 응답에 `start_date`/`end_date` 포함

### 3. getChallengeDetail 함수
- **라인 351-353**: `start_date`/`end_date`로 총 일수 계산
- **라인 369-386**: `start_date`/`end_date`로 상태 계산 (current/completed/upcoming)
- **라인 414-415**: 응답에 `start_date`/`end_date` 포함

## 프론트엔드 사용처

### 1. frontend/src/utils/challengeDay.js
- **라인 66-73**: 선택하지 않은 챌린지의 경우 `start_date` 기준으로 일차 계산
  ```javascript
  const startDate = normalizeDateOnly(challenge.start_date);
  if (startDate && today) {
    const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const calculatedDay = diffDays + 1;
    return Math.max(1, Math.min(totalDays, calculatedDay));
  }
  ```

### 2. frontend/src/components/ChallengeSelector.js
- **라인 150-152**: `start_date`로 최신순 정렬
  ```javascript
  const dateA = new Date(a.start_date);
  const dateB = new Date(b.start_date);
  return dateB - dateA;
  ```

### 3. frontend/src/components/ChallengeCard.js
- **라인 158**: `start_date`/`end_date` 표시
  ```javascript
  {formatDate(challenge.start_date)} ~ {formatDate(challenge.end_date)}
  ```

### 4. frontend/src/components/ChallengeDetail.js
- **라인 113-115**: 이미 처리됨 - `start_date`/`end_date` 제거
  ```javascript
  delete challengeData.start_date;
  delete challengeData.end_date;
  ```

## 데이터베이스 스키마

### challenges 테이블
- `start_date DATE NOT NULL`
- `end_date DATE NOT NULL`
- 스키마 파일들:
  - `schema_v250406.sql`: 테이블 생성 및 초기 데이터
  - `schema_v250820.sql`, `schema_v250923_2.sql`, `schema_v251124.sql`: 데이터 삽입

## API 응답 필드

### 현재 포함되는 필드
- `/api/challenges`: `start_date`, `end_date` (current/completed/upcoming 모두)
- `/api/challenges/:id`: `start_date`, `end_date`

### 제거 대상
- 모든 API 응답에서 `start_date`/`end_date` 필드 제거
- 대신 `startedAt`은 클라이언트에서 관리 (로컬 스토리지)

## UI 표시 요소

### 제거 대상
- ChallengeCard: 날짜 범위 표시 (`start_date ~ end_date`)
- ChallengeSelector: 정렬 기준 (최신순은 `created_at` 또는 `id`로 대체 가능)

## 문서 참조

### ADR 문서
- `docs/adr/0001-timezone-management-policy.md`: 일정형 챌린지 언급
- `docs/adr/0002-challenge-status-definition.md`: 일정형/선택형 챌린지 공존 언급

### 계획 문서
- `docs/plan/0001-remove-schedule-based-challenges.md`: 본 작업 계획

## 다음 단계

1. ✅ 사용처 인벤토리 완료
2. ⏳ 단일 모델 정의 (API 계약 명시)
3. ⏳ 백엔드 정리
4. ⏳ 프론트엔드 정리
5. ⏳ 데이터/마이그레이션
6. ⏳ 분석/테스트
7. ⏳ 문서/ADR 정리
