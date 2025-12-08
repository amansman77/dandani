# ADR-0001: 시간대 관리 정책 (Timezone Management Policy)

## Status
**Accepted** - 2025-12-05

## Context

단단이 서비스는 전 세계 사용자를 대상으로 하며, 챌린지 일차 계산, 실천 기록 날짜 비교, 챌린지 갱신 시간 등에서 시간대 처리가 중요합니다.

### 문제 상황
- 사용자가 다른 시간대에서 서비스를 이용할 수 있음
- 챌린지 일차 계산이 사용자 로컬 시간 기준으로 이루어져야 함
- 서버는 UTC 기준으로 데이터를 저장하지만, 클라이언트는 로컬 시간 기준으로 표시해야 함
- `startedAt` 필터링 시 로컬 시간대를 고려하지 않아 잘못된 필터링이 발생할 수 있음

### 기존 문제점
1. 백엔드에서 `startedAt` 필터링 시 시간까지 비교하여 같은 날짜라도 시간 차이로 필터링이 잘못됨
2. UTC 시간과 로컬 시간 간 변환이 일관되지 않음
3. 날짜 비교 시 자정 기준이 명확하지 않음

## Decision

### 핵심 원칙

**"서버는 UTC 기준으로 처리하되, 클라이언트에서 로컬 시간 기준으로 전환한다"**

### 1. 서버(백엔드) 정책

#### 1.1 데이터 저장
- **모든 날짜/시간 데이터는 UTC 기준으로 저장**
  - 데이터베이스의 `created_at`, `startedAt` 등은 모두 UTC 시간
  - SQLite DATETIME 형식 사용 (UTC로 해석)

#### 1.2 날짜 계산
- **클라이언트 시간대 정보를 받아 로컬 날짜 계산**
  - `X-Client-Timezone` 헤더: 클라이언트 시간대 (예: "Asia/Seoul")
  - `X-Client-Time` 헤더: 클라이언트 현재 시간 (ISO 8601 형식)
  - `getClientLocalDate(clientTime, clientTimezone)` 함수 사용

#### 1.3 날짜 비교
- **날짜 비교는 항상 자정 기준 (날짜만 비교)**
  - 시간까지 비교하지 않음
  - SQLite `date()` 함수 사용: `date(created_at) >= date(?)`
  - `startedAt` 필터링 시 로컬 시간 기준으로 날짜만 추출하여 비교

#### 1.4 챌린지 일차 계산
- **클라이언트 로컬 시간 기준으로 "오늘" 날짜 계산**
  - `getClientLocalDate()` 함수로 클라이언트 로컬 날짜 계산
  - 선택한 챌린지: `startedAt` 기준으로 일차 계산
  - 날짜 기반 챌린지: `start_date` 기준으로 일차 계산

### 2. 클라이언트(프론트엔드) 정책

#### 2.1 시간 정보 전송
- **모든 API 요청에 시간대 정보 포함**
  ```javascript
  headers: {
    'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    'X-Client-Time': new Date().toISOString()
  }
  ```

#### 2.2 날짜 표시
- **로컬 시간 기준으로 날짜 표시**
  - `normalizeDateOnly()` 함수로 로컬 시간 기준 날짜 정규화
  - `formatDateToKorean()` 함수로 한국어 형식으로 포맷팅

#### 2.3 챌린지 일차 계산
- **로컬 시간 기준으로 일차 계산**
  - `calculateChallengeDay()` 함수 사용
  - 서버에서 받은 `practice.day` 우선 사용 (가장 정확)

### 3. 날짜 비교 규칙

#### 3.1 자정 기준
- **모든 날짜 비교는 자정(00:00) 기준**
  - 같은 날짜면 같은 것으로 간주
  - 시간 차이는 무시

#### 3.2 startedAt 필터링
- **로컬 시간 기준으로 날짜만 비교**
  ```javascript
  // 백엔드에서
  const startedAtDate = getClientLocalDate(startedAt, clientTimezone);
  const startedAtDateStr = startedAtDate.toISOString().split('T')[0];
  query += ` AND date(created_at) >= date(?)`;
  ```

#### 3.3 실천 기록 확인
- **오늘의 기록인지 확인 시 로컬 시간 기준**
  - 백엔드에서 반환된 `created_at`은 UTC이므로 로컬 시간으로 변환 필요
  - 프론트엔드에서 날짜 비교 시 `normalizeDateOnly()` 사용

### 4. 구현 세부사항

#### 4.1 백엔드 함수
- `getClientLocalDate(clientTime, clientTimezone)`: 클라이언트 로컬 날짜 계산
- `normalizeUTCDate(value)`: UTC 날짜 정규화
- `calculateChallengeDayFromStart(startValue, currentDate, totalDays)`: 일차 계산

#### 4.2 프론트엔드 함수
- `normalizeDateOnly(value)`: 로컬 시간 기준 날짜 정규화
- `calculateChallengeDay(challenge, options)`: 챌린지 일차 계산
- `parseDatabaseDate(dateValue)`: 데이터베이스 날짜 파싱 (UTC → 로컬)
- `formatDateToKorean(dateValue, options)`: 한국어 형식 포맷팅

## Consequences

### Positive
- ✅ 시간대 처리 일관성 확보
- ✅ 사용자 경험 개선 (로컬 시간 기준 표시)
- ✅ 날짜 비교 정확도 향상
- ✅ 사이드 이펙트 최소화 (명확한 정책)

### Negative
- ⚠️ 시간대 변환 로직 복잡도 증가
- ⚠️ 테스트 시 다양한 시간대 시나리오 고려 필요

### Risks
- ⚠️ 시간대 정보가 없는 경우 UTC 기준으로 폴백
- ⚠️ 서머타임(DST) 처리 시 주의 필요 (현재는 고정 오프셋 사용)

## Implementation

### 적용된 함수들

#### 백엔드 (`workers/src/index.js`)
1. `getTodayPractice()`: 오늘의 실천 과제 조회
   - `getClientLocalDate()` 사용
   - `date(created_at) >= date(?)` 날짜 비교

2. `getPracticeRecord()`: 실천 기록 조회
   - `startedAt` 필터링 시 로컬 시간 기준 날짜 비교

3. `getPracticeHistory()`: 실천 기록 히스토리 조회
   - `startedAt` 필터링 시 로컬 시간 기준 날짜 비교

#### 프론트엔드 (`src/utils/challengeDay.js`)
1. `normalizeDateOnly()`: 로컬 시간 기준 날짜 정규화
2. `calculateChallengeDay()`: 챌린지 일차 계산
3. `parseDatabaseDate()`: 데이터베이스 날짜 파싱
4. `formatDateToKorean()`: 한국어 형식 포맷팅

### 헤더 규칙

모든 API 요청에 다음 헤더 포함:
```javascript
{
  'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
  'X-Client-Time': new Date().toISOString(),
  'X-User-ID': userId
}
```

선택한 챌린지의 경우:
```javascript
{
  'X-Started-At': startedAt  // ISO 8601 형식 (UTC)
}
```

## References

- [MDN: Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [SQLite Date and Time Functions](https://www.sqlite.org/lang_datefunc.html)
- [ISO 8601 Date Format](https://en.wikipedia.org/wiki/ISO_8601)

## Notes

- 현재 시간대 매핑은 주요 시간대만 지원 (Seoul, Tokyo, Beijing, New York, London)
- 향후 더 정확한 시간대 처리를 위해 라이브러리 도입 고려 가능 (예: date-fns-tz, moment-timezone)
- 서머타임(DST) 처리는 현재 고정 오프셋 사용 (향후 개선 필요)

## Related ADRs

- (향후) ADR-0002: 실천 기록 날짜 필터링 정책
- (향후) ADR-0003: 챌린지 갱신 시간 정책
