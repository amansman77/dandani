# Dandani Retention Engine - MVP Implementation Plan

## Goal
Improve user retention by introducing a "completion → emotional feedback → growth recognition" loop.

## Problem Statement
Current UX only supports action execution.
There is no emotional reward, no sense of progress, and no retention loop.

We need to implement:
→ Completion Event
→ Streak System
→ Emotional Feedback
→ Growth Record

## Scope (MVP)

### 1. Completion Event (High Priority)

#### Description
When a user completes today's challenge, show a dedicated completion modal.

#### Requirements
- Trigger: after "오늘 실천 이어가기" is completed
- UI: modal or full screen overlay

#### UI Content
- Title: "오늘의 실천 완료 🎉"
- Streak message
- Emotional feedback message (template-based)
- CTA buttons:
  - "내 기록 보기"
  - "내일도 이어가기"

#### Example
오늘의 실천 완료 🎉  
🔥 3일째 중심을 지키고 있어요  
어제보다 더 단단해졌어요

### 2. Streak System (High Priority)

#### Description
Track consecutive days of action completion.

#### Logic
- If user completes action on consecutive days → streak +1
- If missed a day → reset streak to 1

#### Data Model

```ts
type UserState = {
  streakDays: number
  totalActions: number
  lastActionDate: string // YYYY-MM-DD
}
````

#### Display

Replace:

* "진행률 43%"

With:

* 🔥 3일째 중심 유지 중
* 🌱 이번 챌린지 4/7일 진행
* 💪 총 12번 실천

### 3. Emotional Feedback (High Priority)

#### Description

Generate a message that reinforces emotional progress.

#### Implementation (MVP)

Use template-based logic (no AI required yet)

#### Rules

```ts
function generateFeedback(streakDays: number): string {
  if (streakDays <= 3) {
    return "시작했다는 것 자체가 이미 단단함입니다"
  }
  if (streakDays <= 7) {
    return "반복 속에서 중심이 만들어지고 있어요"
  }
  return "이건 습관이 아니라 태도가 되고 있어요"
}
```

#### Output Format

"[streak message] + [emotional feedback]"

### 4. Growth Log (Medium Priority)

#### Description

Store user actions as "growth records"

#### Data Model

```ts
type ActionLog = {
  date: string
  challengeId: string
  note?: string
}
```

#### Behavior

* On completion → create ActionLog
* Show logs in "내 기록" tab

#### Example UI

2026-03-25
나는 오늘도 중심을 지켰다
→ 아침 1분 루틴 완료

### 5. CTA Flow (Medium Priority)

After completion modal:

* Button 1 → "내 기록 보기"
* Button 2 → "내일도 이어가기"
* Optional → "오늘 한 줄 남기기"

## 🔁 User Flow

1. User clicks "오늘 실천 이어가기"
2. Completes action
3. System:

   * Updates streak
   * Saves ActionLog
   * Generates feedback
4. Shows Completion Modal
5. User chooses next action

## 📊 Event Tracking (Optional but Recommended)

Track events:

* action_completed
* completion_modal_viewed
* streak_updated
* growth_log_created

## 🚀 Implementation Priority

### Phase 1 (Must Have)

* Completion Modal
* Streak Logic
* Feedback Template

### Phase 2

* Growth Log UI
* Improved CTA flow

### Phase 3

* AI-based feedback generation

## 🧠 Key Principle

Dandani is not a habit tracker.

It is a system that helps users recognize:

→ "I am becoming stronger"

All features must reinforce this perception.
