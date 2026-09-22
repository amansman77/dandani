# 📘 plan.md — Dandani Onboarding & Retention Fix (v1)

## 🎯 Goal

* Solve **“why should I use this?” problem**
* Improve **Day1 retention from 0% → 20%**
* Fix onboarding confusion and meaningless completion flow

---

## 🔍 Problem Summary

### 1. Onboarding Issue

* Current onboarding is **emotional but not explanatory**
* Users do not understand:

  * What this service does
  * What action they should take
  * What result they will get

### 2. Completion Flow Issue

* Flow ends at "practice complete"
* No meaning, no reflection, no continuation
* Result:
  → Users leave immediately

### 3. Data Evidence

* DAU low and inconsistent
* Retention = 0%
* Funnel:

  * Pageview → OK
  * Practice → OK
  * Record → 0%
  * Return → 0%

---

## 🧠 Core Strategy

We redesign the product around this loop:

```
Understand → Act → Reflect → Continue → Return
```

---

## 🛠️ Implementation Plan

# 1️⃣ Onboarding Redesign

## Objective

Make user understand in 3 seconds:

* What it is
* Why it matters
* What to do next

---

## New Onboarding Structure (3 steps)

### STEP 1 — What is this?

**Title**
하루 1분, 내 감정을 정리하는 시간

**Description**
단단이는
하루 하나의 작은 실천으로
나를 돌아보는 서비스입니다

---

### STEP 2 — What do I do?

**Title**
오늘의 챌린지를 선택하세요

**Description**
간단한 실천을 해보세요

예:

* 깊게 숨 쉬기
* 오늘 감정 적기
* 나에게 한마디 하기

---

### STEP 3 — What do I get?

**Title**
한 줄 기록으로 나를 남기세요

**Description**
실천 후 짧게 기록하면
내 감정의 흐름이 쌓입니다

---

### CTA Button

지금 시작하기

---

## Additional Requirement

* Remove abstract emotional-only messaging
* Prioritize clarity over sentiment
* Keep sentences short and direct

---

# 2️⃣ Completion Flow Redesign (CRITICAL)

## Current Problem

"Practice complete" has no meaning or next action

---

## New Flow

### After user clicks [실천 완료]

### Step A — Meaning Injection

Show message:

```
🌱 오늘의 단단함이 쌓였어요

작은 실천이지만,
이건 '흔들리지 않으려는 선택'이에요
```

---

### Step B — Forced Reflection (Required)

Input field (minimum 1 character)

Prompt:

```
지금 느낀 걸 한 줄로 남겨보세요
```

Rules:

* Cannot skip
* Must input at least 1 character

---

### Step C — Continuation Trigger

After submission:

```
내일도 이어서 해볼까요?
```

Options:

* same time reminder (optional toggle)
* or simple confirmation CTA

---

# 3️⃣ Next Day Return Hook

## When user revisits

Show:

```
어제 남긴 한 줄

"{{user_record}}"

오늘도 이어볼까요?
```

---

## Purpose

* Trigger memory
* Create emotional continuity
* Increase return probability

---

# 4️⃣ Language Guard (Quick Fix)

## Problem

Non-Korean users entering → confusion

---

## Solution

### Option A (fast)

Show banner:

```
이 서비스는 한국어로 제공됩니다
```

### Option B (recommended)

Detect browser language:

IF not "ko":

* show message OR block onboarding

---

# 5️⃣ Tracking (PostHog Events)

## Add / Verify Events

* onboarding_completed
* challenge_selected
* practice_completed
* record_submitted
* return_next_day

---

## Key Metrics

* Practice → Record conversion rate
* Record → Next day return rate

---

# 🚀 Execution Priority

## Phase 1 (Today)

* [ ] Replace onboarding copy
* [ ] Add completion meaning screen
* [ ] Add record input (required)

## Phase 2

* [ ] Add next-day recall UI
* [ ] Add language guard

## Phase 3

* [ ] Optimize copy based on behavior data

---

# 🔥 Definition of Success

* Users understand service within 3 seconds
* At least 50% of users submit a record
* At least 20% return next day

---

# 🧠 Product Principle

Dandani is NOT:

* a content service

Dandani IS:

* a self-reflection loop

---

# ✍️ One-line Definition

"실천을 남기고, 내일을 이어주는 서비스"
