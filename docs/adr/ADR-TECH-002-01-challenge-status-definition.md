# ADR-TECH-002-01: 챌린지 상태 정의 (Challenge Status Definition – Final)

## Status

**Accepted** – 2026-01-18  
**Updated** – 2026-01-18 (코드 단순화 반영: `ignoreTotalDaysLimit` 옵션 제거)  
*(Revised from ADR-0002, 2026-01-10)*

## Context

단단이 서비스에서는 챌린지의 진행 상태를 기준으로
화면 구성, CTA, 다음 행동 유도 UX가 결정된다.

기존 ADR-0002에서는 `upcoming / current / completed` 상태 정의가 존재했으나,

* `completed`가

  * “기간이 종료됨”인지
  * “모든 실천을 완료함”인지
    명확히 분리되지 않았고
* `completed`와 `upcoming`이 모두 “실천 불가 상태”로 보일 수 있으며
* 축하 UX, 다음 챌린지 선택 UX 등 **행동 기반 UX가 상태에 의존**할 위험이 있었다.

이에 본 개정안은 다음 원칙을 명시적으로 고정한다.

> **상태(status)는 시간 기반(Time-based Lifecycle)만 표현한다.**
> **성취·축하·전환 UX는 이벤트(event) 기반으로 처리한다.**

## Decision

### 1. 상태의 역할 정의 (Core Principle)

> **Challenge Status는 “시간의 흐름에서의 위치”만을 나타낸다.**
> 사용자의 실천 성과, 성취감, 완료 여부는 상태가 아닌 **지표(metrics)** 또는 **이벤트(event)** 로 표현한다.

### 2. 상태 집합 (Canonical Status Set)

| Status      | 정의                           |
| ----------- | ---------------------------- |
| `upcoming`  | 챌린지가 아직 시작되지 않음 (시간 흐름 진입 전) |
| `current`   | 챌린지가 진행 중                    |
| `completed` | 챌린지의 모든 예정 기간이 경과됨           |

📌 `completed`는

* “잘 해냈다” ❌
* “모든 실천을 했다” ❌
* **“시간상 종료되었다”** ✅

### 3. 입력 값 (Inputs)

* `total_days` (>= 1)
* `currentDay`

  * 프런트엔드: `calculateChallengeDay(challenge, options)`
    * **항상** `startedAt` 기준 실제 경과 일수 반환 (totalDays 제한 없음)
    * 옵션: 현재 사용되지 않음 (호환성을 위해 유지)
  * 백엔드: `/api/practice/today`, `/api/challenges/:id`
    * `currentDay`는 `startedAt` 기준 실제 경과 일수 (제한 없음)
* **중요**: 
  * 상태 계산은 항상 실제 경과 일수 사용 (제한 없음)
  * 오늘의 실천 과제가 필요할 때는 호출하는 쪽에서 `Math.min(actualDay, totalDays)` 사용
* 시작 기준:

  * LocalStorage `startedAt`
  * 모든 챌린지 관련 요청에 `X-Started-At` 헤더 필수
* 시간대/날짜 정규화:

  * ADR-0001 (Timezone Management Policy) 준수

### 4. 상태 판정 규칙 (Time-based Rules)

```text
# currentDay는 startedAt 기준 실제 경과 일수 (totalDays 제한 없음)
if currentDay < 1:
  status = upcoming

if 1 <= currentDay <= total_days:
  status = current

if currentDay > total_days:
  status = completed
```

📌 **중요 사항**:
* 이 판정은 **실천 여부, 기록 수와 무관**하다.
* `currentDay`는 **실제 경과 일수**를 사용해야 함
* `calculateChallengeDay`는 항상 실제 경과 일수를 반환 (별도 옵션 불필요)
* 오늘의 실천 과제가 필요할 때는 호출하는 쪽에서 `Math.min(actualDay, totalDays)` 사용

### 5. 완료·성과 지표 (Experience-based Metrics)

상태와 완전히 분리된 개념으로 다음 지표를 계산한다.

* `completed_days`

  * `practice_feedback` 기록 수
* `progress_rate`

  * `completed_days / total_days`
* (선택) `is_fully_completed`

  * `completed_days >= total_days`

📌 이 지표들은:

* UI 피드백
* 회고
* 통계
  용도로만 사용되며 **상태를 변경하지 않는다.**

## UX Policy (중요)

### 6. 다음 챌린지 선택 UX의 트리거

> **다음 챌린지 선택 화면은 `completed` 상태 진입을 기준으로 노출한다.**

* 트리거 기준:

  * `previousStatus === current`
  * `currentStatus === completed`
* 의미:

  * “이야기가 끝났음”
  * “현재 진행 중인 챌린지가 없음”

📌 `upcoming`은 절대 트리거가 될 수 없다.

### 7. 축하 UX (모든 챌린지 완료 카드)의 기준

> **“모든 챌린지를 완료했습니다” 축하 카드는
> 상태가 아니라 ‘마지막 실천 이벤트’를 기반으로 노출한다.**

#### 트리거 조건

```text
- 사용자가 '실천하기'를 눌러 기록이 저장되었고
- 해당 저장으로 completed_days === total_days 가 되는 순간
- 아직 축하 UX가 표시되지 않았음 (1회성 보장)
```

📌 **참고**: "마지막 챌린지" 조건은 선택사항이며, 현재 구현에서는 모든 챌린지 완료 시 축하 UX를 표시합니다.

📌 이는 다음과 같은 이유로 **이벤트 기반**이어야 한다.

* `completed` 상태는 시간 경과만으로 도달 가능
* 축하는 “행동의 완결” 순간에만 1회 노출되어야 함
* 새로고침/재접속 시 재노출되면 UX 사고 발생

## Consequences

### Positive

* `upcoming` ↔ `completed`의 시간 축 의미가 명확히 분리됨
* 상태와 성취 UX의 책임 경계가 명확
* 실패한 챌린지(0일 실천)도 자연스럽게 데이터로 보존 가능
* 축하 UX, 다음 선택 UX가 감정적으로 정확한 타이밍에 노출됨
* 재도전, 회고, 자동 추천 등 확장에 유리

### Negative

* `completed` 상태에서도 실천 0일 가능 → UI 설명 필요
* 상태만 보고 성취를 판단하려는 오해 가능성
* 이벤트 기반 UX는 중복 노출 방지 로직 필요

## Implementation

### Frontend

* `frontend/src/utils/challengeDay.js`

  * `calculateChallengeDay(challenge, options)`
    * **단순화**: 항상 `startedAt` 기준 실제 경과 일수 반환 (totalDays 제한 없음)
    * 옵션: 현재 사용되지 않음 (호환성을 위해 유지)
    * **설계 원칙**: 함수는 단일 책임만 수행 (실제 경과 일수 계산)
    * **사용 예시**:
      ```javascript
      // 상태 계산용 (항상 실제 경과 일수)
      const actualDay = calculateChallengeDay(challenge);
      const { status } = calculateChallengeStatus(challenge);
      
      // 오늘의 실천 과제용 (필요 시 제한)
      const totalDays = challenge.total_days;
      const practiceDay = Math.min(actualDay, totalDays);
      // 또는 서버의 practice.day 사용
      const practiceDay = practice?.day ? Math.min(practice.day, totalDays) : Math.min(actualDay, totalDays);
      ```
  * `calculateChallengeStatus(challenge, options)`
    * 실제 경과 일수 기준으로 상태 계산 (항상 제한 없음)
    * 반환: `{ status: 'current' | 'completed' | 'upcoming', currentDay: number }`
  * `calculateChallengeProgress(challenge, options)`
    * 실제 경과 일수 기준으로 진행률 계산
    * 반환: `{ currentDay: number, progressPercentage: number }`
  * `calculateChallengeMetrics(challenge, options)`
    * 완료·성과 지표 계산 (상태와 분리)
    * 반환: `{ completedDays: number, progressRate: number, isFullyCompleted: boolean }`
* UX 구현

  * 다음 챌린지 선택: **상태 전이 기반** (`previousStatus === 'current' && currentStatus === 'completed'`)
  * 축하 카드: **실천 이벤트 기반 (1회성)** (`metrics.isFullyCompleted && !previousCompleted`)
* 챌린지 관련 모든 API 요청에 `X-Started-At` 헤더 필수

### Backend

* `workers/src/index.js`

  * `/api/practice/today`
    * `practice.day` 반환 (오늘의 실천 과제용, `totalDays`로 제한될 수 있음)
  * `/api/challenges`
    * 챌린지 목록 반환 (상태 계산은 클라이언트에서 수행)
  * `/api/challenges/:id`
    * 상태 계산: `currentDay > totalDays` 기준으로 `completed` 판정
    * `currentDay`는 `startedAt` 기준 실제 경과 일수 (제한 없음)
* 상태 계산: time-based only
  * `currentDay < 1` → `upcoming`
  * `1 <= currentDay <= totalDays` → `current`
  * `currentDay > totalDays` → `completed`
* 기록 집계:

  * `X-Started-At` 이후 `practice_feedback`만 포함
* `start_date`, `end_date` 필드 완전 제거

## References

* ADR-0001: 시간대 관리 정책 (Timezone Management Policy)
* ADR-0003: 챌린지 모델 통일 (Challenge Model Unification)
* `frontend/src/utils/challengeDay.js`
* `workers/src/index.js`

## ⚖️ 검증 포인트 (Self-Critique)

* [x] 상태가 “시간의 위치”만 표현하는가?
* [x] completed와 upcoming이 개념적으로 명확히 분리되는가?
* [x] 축하 UX가 상태가 아닌 행동을 축하하는가?
* [x] 새로고침·재접속 시 UX 사고가 발생하지 않는가?
* [x] 실패·부분 성공·재도전 시나리오로 확장 가능한가?
