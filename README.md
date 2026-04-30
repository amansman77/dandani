# Dandani V2

## 🌱 Overview

Dandani V2 is a personalized behavior agent.

It does not recommend content.  
It does not track habits.

It:

> learns a person's emotional state and behavioral responses  
> and suggests a small, executable action for that moment.

---

## 🎯 Goal

Validate whether:

> A system can personalize action (not content)  
> using a user’s emotion and past response data.

---

## 💬 One-line Definition

> Dandani is an agent that suggests the smallest actionable step  
> based on a user’s current emotion and past behavior.

---

## 🧠 Core Concept

Dandani operates on a simple loop:

id="loopcore" State → Action → Response → Update

- State: current emotion + situation
- Action: one small executable behavior
- Response: user result + feeling
- Update: pattern learning for next action

---

## 👤 User Experience (Single Cycle)

### 1. Greeting

Dandani appears:

> "왔구나. 지금 어떤 상태야?"

---

### 2. Current State

User inputs one line:

- "피곤하고 아무것도 하기 싫다"
- "짜증나고 집중이 안 된다"
- "그냥 아무 느낌 없다"

---

### 3. Desired State

Dandani asks:

> "오늘은 어떤 상태가 되고 싶어?"

Examples:
- "조금이라도 해냈다는 느낌"
- "조금 편안해지고 싶다"

---

### 4. Action Suggestion

Dandani generates one action.

Constraints:
- ≤ 10 minutes
- single step
- immediately executable

Examples:
- "딱 3분만 가장 하기 싫은 일을 시작해보기"
- "지금 감정을 한 문장으로 적어보기"
- "오늘 기억나는 순간 하나 떠올리기"

---

### 5. User Feedback

User selects:
- 완료
- 부분 완료
- 못함

+ optional feeling input

---

### 6. Reflection

Dandani summarizes:

> "오늘 너는 완벽하게 하려 하지 않고, 시작하는 걸 선택했어."

---

### 7. Next Commitment

Dandani closes the cycle:

> "다음에도 지금 상태에서 할 수 있는 가장 작은 한 걸음을 같이 찾아보자."

---

## 🔁 System Flow

id="systemflow" Input (state) → Interpret → Generate Action → User Response → Reflection → Pattern Update → Store

---

## 🧩 Core Components

### 1. Behavior Agent

- interprets emotional state
- generates action
- creates reflection
- updates next strategy

---

### 2. User Context Store

Stores:
- past states
- actions
- results
- pattern notes

---

### 3. Policy / Constraints

Defines:
- action size (≤ 10 min)
- cognitive load limits
- emotional safety boundaries

---

### 4. Action Log DB

Example:

json id="actionlog" {   "current_state": "피로 + 회피",   "desired_state": "조금 해냈다는 느낌",   "action": "미뤄둔 일 첫 줄 열어보기",   "result": "완료",   "after_feeling": "조금 덜 찝찝함",   "pattern_note": "낮은 진입 장벽에서는 실행 가능",   "next_hint": "시간 제한 기반 행동 유지" } 

---

## 📊 MVP Scope

### Included

- one-line state input
- desired state input
- single action generation
- simple feedback (완료 / 부분 / 실패)
- reflection generation
- pattern note storage

---

### Excluded

- multi-step plans
- complex AI models
- long-term analytics UI
- social features

---

## ⚙️ Design Principles

### 1. Action First

Focus on behavior, not interpretation.

---

### 2. Smallest Step

Every action must be:
- short
- simple
- immediately doable

---

### 3. One Action Only

No choices, no branching.

---

### 4. Measurable Outcome

Every cycle produces:
- result
- feeling

---

## ⚠️ Risks

### 1. Fake Empathy

LLM may generate comforting but useless responses.

→ prioritize action over wording

---

### 2. Poor Early Personalization

Lack of data may lead to bad suggestions.

→ apply rule-based constraints early

---

### 3. User Drop-off

User may stop returning.

→ keep interaction extremely lightweight

---

## 🧭 Positioning

Dandani is not:

- a motivation app
- a habit tracker
- a journaling tool

It is:

> a system that personalizes behavior using emotion and response data.

---

## 🧪 Experiment Name

Dandani V2 — Personalized Behavior Agent MVP

---

## 🚀 Next Steps

1. Define action generation rules
2. Define pattern learning schema
3. Create 10 sample user cycles
4. Implement loop
5. Validate action effectiveness

---

## 🔑 Final Insight

> Personalization is not about what users consume.  
> It is about what users can do next