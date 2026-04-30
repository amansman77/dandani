# ADR-PROD-004 Action UI Components

## 상태
제안

---

## 맥락

ADR-PROD-003에서 단단이 행동 타입을 정의했다.

이제 각 행동 타입은 단순 텍스트가 아니라, 사용자가 바로 따라 할 수 있는 UI 컴포넌트로 구현되어야 한다.

핵심 전환:

> 행동을 설명하지 않고, 행동을 실행시키는 UI를 만든다.

---

## 결정

Dandani V2는 Action Type에 따라 고정된 UI Component를 사용한다.

```
State Input
→ Action Type Selection
→ Action UI Component Render
→ User Action
→ Result Feedback
→ Record
```

---

## 1. 공통 Action Component 구조

모든 Action UI는 다음 구조를 가진다.

```json
{
  "action_id": "uuid",
  "action_type": "CALM",
  "character_scene": "reading_dandani_rainy_day",
  "title": "숨 3번 쉬기",
  "instruction": "단단이랑 같이 천천히 3번만 숨 쉬어보자.",
  "duration_seconds": 60,
  "completion_condition": "3번의 호흡 루프를 완료하면 완료",
  "ui_component": "BreathingAction",
  "result_options": ["못했어", "조금 했어", "해냈어"]
}
```

---

## 2. START Component

**목적:** 미루기, 회피, 무기력 상태에서 시작 장벽을 낮추는 컴포넌트.

**사용 상황:** "하기 싫어" / "미루고 있어" / "시작을 못하겠어"

**UI:**

```
[코딩/작업 단단이 이미지]
단단이: "같이 시작만 해보자."

[3] [2] [1]

오늘의 한 걸음:
딱 10초만 파일/문서/일을 열어보기

[시작하기]
```

**인터랙션:**
시작하기 → 3초 카운트다운 → 10초 타이머 → 결과 선택

**내부 데이터:**
```json
{
  "action_type": "START",
  "ui_component": "StartCountdownAction",
  "duration_seconds": 10,
  "completion_condition": "10초 동안 대상 작업을 열고 바라보기"
}
```

---

## 3. CALM Component

**목적:** 피로, 불안, 긴장 상태에서 몸과 마음을 안정시키는 컴포넌트.

**사용 상황:** "피곤해" / "불안해" / "짜증나" / "쉬고 싶어"

**UI:**

```
[휴식/독서 단단이 이미지]
단단이: "지금은 천천히 해도 돼."

숨을 들이마셔  ● ○ ○
숨을 내쉬어    ○ ● ○

[같이 숨 쉬기]
```

**인터랙션:**
같이 숨 쉬기 → inhale/exhale 애니메이션 3회 → 결과 선택

**내부 데이터:**
```json
{
  "action_type": "CALM",
  "ui_component": "BreathingAction",
  "breath_count": 3,
  "completion_condition": "3번의 호흡 루프 완료"
}
```

---

## 4. FOCUS Component

**목적:** 산만함, 집중 저하 상태에서 짧은 몰입을 시작하는 컴포넌트.

**사용 상황:** "집중이 안 돼" / "딴짓하고 있어" / "해야 하는데 산만해"

**UI:**

```
[코딩/책상 단단이 이미지]
단단이: "딱 3분만 같이 붙잡아보자."

오늘 붙잡을 것:
[사용자 입력 또는 에이전트가 추출한 대상]

03:00

[3분 집중 시작]
```

**인터랙션:**
3분 집중 시작 → 3분 타이머 → 중간 방해 최소화 → 결과 선택

**내부 데이터:**
```json
{
  "action_type": "FOCUS",
  "ui_component": "FocusTimerAction",
  "duration_seconds": 180,
  "completion_condition": "3분 동안 하나의 대상에 머무르기"
}
```

---

## 5. MOVE Component

**목적:** 무기력, 답답함 상태에서 몸을 움직여 상태를 전환하는 컴포넌트.

**사용 상황:** "몸이 무거워" / "답답해" / "늘어져 있어"

**UI:**

```
[등산/산책 단단이 이미지]
단단이: "몸을 조금만 깨워보자."

오늘의 한 걸음:
자리에서 일어나 5걸음 걷기

[같이 걷기]
```

**인터랙션:**
같이 걷기 → 5걸음 카운트 또는 20초 타이머 → 결과 선택

**내부 데이터:**
```json
{
  "action_type": "MOVE",
  "ui_component": "MoveAction",
  "target_steps": 5,
  "fallback_duration_seconds": 20,
  "completion_condition": "5걸음 걷기 또는 20초 동안 움직이기"
}
```

---

## 6. RELEASE Component

**목적:** 답답함, 화남, 억눌림 상태에서 감정을 밖으로 꺼내는 컴포넌트.

**사용 상황:** "화나" / "답답해" / "말하고 싶은데 못하겠어" / "머리가 복잡해"

**UI:**

```
[일기 쓰는 단단이 이미지]
단단이: "정리하지 않아도 돼. 그냥 한 줄만 꺼내자."

입력창: 지금 머릿속에 있는 말 한 줄...

[남기기]
```

**인터랙션:**
한 줄 입력 → 남기기 → 결과 선택은 자동 completed 처리 가능 → 회고

**내부 데이터:**
```json
{
  "action_type": "RELEASE",
  "ui_component": "OneLineReleaseAction",
  "requires_text_input": true,
  "completion_condition": "한 줄 이상 입력"
}
```

---

## 7. REFLECT Component

**목적:** 행동 이후 또는 하루 마무리에서 의미를 정리하는 컴포넌트.

**사용 상황:** 행동 완료 후 / 기록 탭 진입 / 사용자가 "오늘 어땠지" 상태일 때

**UI:**

```
[일기/캠핑 단단이 이미지]
단단이: "오늘 한 걸음은 뭐였을까?"

질문: 오늘 조금이라도 달라진 점이 있었어?
입력창: 한 줄 회고...

[저장하기]
```

**인터랙션:**
한 줄 입력 → 단단이 요약 → 기록 저장

**내부 데이터:**
```json
{
  "action_type": "REFLECT",
  "ui_component": "ReflectionAction",
  "requires_text_input": true,
  "completion_condition": "한 줄 회고 입력"
}
```

---

## 8. 결과 선택 컴포넌트

모든 행동 뒤에는 동일한 ResultFeedback 컴포넌트를 사용한다.

**UI:**

```
단단이: "어땠어?"
[못했어] [조금 했어] [해냈어]
```

**내부 매핑:**
```json
{
  "못했어":   { "result": "not_done", "started": false, "completed": false },
  "조금 했어": { "result": "partial",  "started": true,  "completed": false },
  "해냈어":   { "result": "done",     "started": true,  "completed": true  }
}
```

---

## 9. 캐릭터 씬 매핑

| Action Type | 캐릭터 씬 |
|-------------|----------|
| START | 코딩하는 단단이 / 책상 단단이 |
| CALM | 비 오는 날 책 읽는 단단이 / 꽃밭 단단이 |
| FOCUS | 코딩하는 단단이 |
| MOVE | 등산 단단이 / 해변 단단이 / 가을길 단단이 |
| RELEASE | 일기 쓰는 단단이 |
| REFLECT | 캠핑 단단이 / 일기 쓰는 단단이 |

**핵심 원칙:**
> 캐릭터는 장식이 아니라 행동 상태를 보여주는 UI다.

---

## 한 줄 정리

> 단단이의 Action UI는 행동을 설명하는 화면이 아니라,  
> 단단이가 먼저 보여주고 사용자가 따라 하게 만드는 실행 인터페이스다.
