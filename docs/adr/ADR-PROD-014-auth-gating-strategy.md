# ADR-PROD-014 Auth Gating Strategy for Identity Dandani

## Status
Proposed → Implementing

---

## Goal

Introduce authentication without breaking user flow, while enabling:
- payment
- personalization persistence
- collection system

---

## Problem

현재 구조:
- 로그인 없음
- anonymous 기반 사용

문제:
- 결제 불가능
- 생성한 단단이 유지 불가
- 디바이스 변경 시 데이터 유실

하지만 더 큰 문제는:

> 초반에 로그인 요구 → 사용자 이탈

---

## Decision

**Auth is NOT entry point.**  
**Auth is triggered by intent.**

---

## Core Principle

1. 먼저 경험한다
2. 그 다음 원한다
3. 그 다음 로그인한다

---

## Gating Strategy

---

### Phase 0 — Anonymous Mode (기본)

```
user_state = "anonymous"
```

**Allowed:**
- 상태 입력
- 행동 수행
- 피드백 기록
- 패턴 학습 (anonymous_id 기준)

**Not Allowed:**
- 단단이 생성
- 결제
- 컬렉션 저장

---

### Phase 1 — Intent Trigger (CTA 클릭 시)

**Trigger:**
```
if user clicks "나만의 단단이 만들기":
  check auth
```

**Case 1: Already Logged In**  
→ proceed to creation flow

**Case 2: Not Logged In**  
→ Auth Modal 등장

---

### Auth Modal UX

**Layout:**
```
[ 캐릭터 (작게) ]
"이건 너만의 단단이야."
"계속 간직하려면 로그인이 필요해."
[ 로그인 ]
[ 나중에 할게 ]
```

**핵심 메시지:**
- 로그인 = 귀찮은 과정 ❌
- 로그인 = 보존 / 연결 ⭕

---

## Auth Copy Rules

**❌ 금지:**
- "로그인이 필요합니다"
- "회원가입 후 이용 가능합니다"

**⭕ 허용:**
- "이건 너만의 단단이야"
- "계속 간직하려면 필요해"

---

## Flow Definition

```
User completes 3 cycles
→ CTA visible
User clicks CTA
IF not logged in:
  show auth modal
  IF login success:
    proceed to creation
  IF cancel:
    return to previous state
```

---

## State Model

```json
{
  "user_type": "anonymous | authenticated",
  "intent_to_create": boolean,
  "auth_required": boolean
}
```

---

## Key Timing

**❌ 잘못된 타이밍:**
- 앱 첫 진입
- 첫 행동 전
- 이름 입력 직후

**⭕ 올바른 타이밍:**
> "내 단단이를 만들고 싶다" 라는 욕구가 생긴 순간

---

## UX 강화 요소

**1. Soft Reminder (옵션)**  
CTA 아래 작은 텍스트:
```
"로그인하면 계속 저장할 수 있어"
```

**2. Postpone 전략**
```
if user clicks "나중에":
  allow temporary preview
  but block save / purchase
```

> "경험은 열어주고, 소유는 막는다"

---

## Payment 연결

```
Auth → Creation → Preview → Payment
```

Auth는 결제 이전에 반드시 완료

---

## Anti-Pattern

**1. Hard Gate**  
❌ 로그인 안 하면 아무 것도 못 함

**2. Early Gate**  
❌ 처음부터 로그인 요구

---

## Expected Outcome

- 로그인 전환율 증가
- 이탈 감소
- 결제 자연 연결

---

## Insight

> Authentication should follow desire, not precede it.
