# DANDANI - Challenge → Assistant Loop Integration Plan

## Goal

Implement a seamless loop:
Challenge Completion → Assistant Reflection → Auto Record

This enables:

* Emotional awareness
* Automatic journaling
* Retention improvement

# 1. UX FLOW

## 1.1 Trigger

* Event: `challenge_completed`

## 1.2 Flow

```
challenge_completed
→ show_completion_card
→ user_choice
   → open_assistant (optional)
   → skip (end)
```

# 2. FRONTEND IMPLEMENTATION

## 2.1 Completion Card Component

### Component: `CompletionFeedbackCard`

Props:

* challengeTitle
* completedAt

UI:

* message:
  "잘했어요. 이 작은 선택이 쌓이고 있어요."
* sub message:
  "지금 어떤 느낌이었나요?"

Buttons:

* primary: "느낌 남기기"
* secondary: "나중에 하기"

Action:

* primary → open_assistant_bottom_sheet
* secondary → close

## 2.2 Assistant Bottom Sheet

### Component: `AssistantSheet`

Behavior:

* slide up modal (NOT full page)
* dismissible

State:

* step: 1 | 2 | 3

## 2.3 Conversation Flow (Frontend State)

### Step 1 (auto message)

"방금 실천을 하셨네요 🙂
어떤 점이 가장 기억에 남으셨나요?"

### Step 2 (quick reply buttons)

Options:

* "조금 편안해졌어요"
* "별로 변화 없어요"
* "잘 모르겠어요"

Store:

* selected_emotion

### Step 3 (AI response)

Display:

* AI feedback message

Then:
→ call save_record API

# 3. BACKEND IMPLEMENTATION

## 3.1 API: Save Record

POST `/records`

Request:

```
{
  "userId": string,
  "challengeId": string,
  "emotion": string,
  "note": string,
  "source": "assistant"
}
```

Response:

```
{
  "success": true
}
```

## 3.2 Emotion Mapping

Map quick replies → internal emotion tags:

* "조금 편안해졌어요" → calm
* "별로 변화 없어요" → neutral
* "잘 모르겠어요" → unknown

# 4. AI PROMPT DESIGN

## 4.1 System Prompt

"You are an emotional reflection assistant.
Your goal is to help users recognize small emotional changes after an action.
Keep responses short, warm, and encouraging."

## 4.2 Input Example

User emotion: calm
Challenge: "좋아하는 노래 듣기"

## 4.3 Output Example

"편안함을 느끼셨군요.
이건 감정이 안정되는 방향으로 움직이고 있다는 신호예요.

이런 작은 변화들이 쌓이면 더 단단해질 수 있어요."

# 5. RECORD GENERATION LOGIC

## 5.1 Auto Note Generation

If user did not type:
→ generate note from emotion + challenge

Example:
"노래를 들으며 조금 편안해졌어요"

## 5.2 Data Structure

```
{
  date,
  challenge,
  emotion,
  note,
  createdAt
}
```

# 6. EVENT TRACKING (PostHog)

Track events:

* challenge_completed
* assistant_opened
* assistant_skipped
* assistant_completed
* record_created

# 7. UX SAFETY RULES

* DO NOT force assistant open
* DO NOT require typing
* allow full flow < 30 seconds

# 8. SUCCESS METRICS

* assistant_open_rate
* assistant_completion_rate
* record_creation_rate
* D1 retention uplift

# 9. FUTURE EXTENSIONS

* personalized follow-up challenges
* emotion trend analysis
* weekly insight report

---
