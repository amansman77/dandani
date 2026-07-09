# ADR-PROD-013-UI CTA Repositioning for Identity Dandani

## Status
Proposed → Implementing

---

## Context

현재 "나만의 단단이 만들기" CTA는 다음과 같은 문제를 가진다:

- DONE 화면에서만 제한적으로 노출됨
- 조건 충족 시점에만 잠깐 등장
- Collection 탭에서는 단순 안내 문장만 존재

**Current UX:** "3번 이상 완료하면 나만의 단단이를 만들 수 있어"

**Problem:**
- 행동 유도가 아닌 정보 전달에 그침
- 사용자가 기능 존재를 인지하지 못함
- CTA가 숨겨진 기능처럼 동작함

---

## Decision

CTA를 다음 원칙으로 재설계한다:

1. 항상 보이게 한다 (Persistent Visibility)
2. 버튼 형태로 제공한다 (Actionable UI)
3. 상태에 따라 의미가 변한다 (State-driven CTA)

---

## CTA Surface Architecture

---

### 1. Collection Tab (Primary CTA Surface)

**Layout:**
```
[ Character / Placeholder ]
"아직 너만의 단단이가 없어"
[ CTA BUTTON ]
```

#### CTA State Definition

**1. Not Eligible (progress < 3)**
```json
{
  "state": "locked",
  "label": "🔒 나만의 단단이 만들기",
  "progress_text": "(한 걸음 2 / 3)",
  "action": "show_unlock_hint"
}
```
Behavior: onClick → showModal("조금만 더 쌓이면 만들 수 있어")

**2. Eligible (progress >= 3)**
```json
{
  "state": "active",
  "label": "✨ 나만의 단단이 만들기",
  "action": "navigate_to_creation"
}
```

**3. Already Created**
```json
{
  "state": "secondary",
  "label": "+ 새로운 단단이 만들기",
  "action": "navigate_to_creation"
}
```

---

### 2. One-Step Tab (Secondary CTA Surface)

**Placement:** 캐릭터 카드 하단

**UI:**
```
"너만의 단단이를 만들 수 있어"
[ 만들기 ]
```

**Rule:**
```
if progress >= 2:
  show CTA
else:
  hide
```

Priority: Low emphasis / Discovery 보조 역할

---

### 3. DONE Screen (Conversion CTA Surface)

**Layout:**
```
"오늘 한 걸음 잘 했어"
"이 흐름으로 너만의 단단이를 만들 수 있어"
[ ✨ 나만의 단단이 만들기 ]
```

**Rule:**
```
if progress >= 3:
  show CTA
```

Priority: Highest conversion surface / Emotional momentum 활용

---

## State Model

```json
{
  "progress_count": number,
  "eligible": boolean,
  "has_dandani": boolean
}
```

Derived Logic: `eligible = progress_count >= 3`

---

## UI Token Definition

**Locked:**
```json
{
  "background": "gray-200",
  "text": "gray-500",
  "icon": "lock"
}
```

**Active:**
```json
{
  "background": "primary",
  "text": "white",
  "icon": "sparkle"
}
```

**Secondary:**
```json
{
  "background": "transparent",
  "text": "primary",
  "border": "1px solid primary"
}
```

---

## Anti-Pattern

❌ 설명만 있는 UI
```
"3번 이상 완료하면 만들 수 있어"
```
Why:
- 행동 유도 없음
- 클릭 유도 없음
- 기능 인지 실패

---

## Expected Outcome

- CTA 발견률 증가
- 기능 인지 명확화
- 행동 전환율 상승

---

## Insight

> Users do not discover features.  
> They click what is visible.
