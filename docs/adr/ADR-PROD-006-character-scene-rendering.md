# ADR-PROD-006 Character Scene Rendering

## 상태
제안

---

## 맥락

ADR-PROD-005에서 다음이 구현되었다:

- 사용자 입력 → Emotion Vector 추출
- Emotion Vector 기반 Action Type 결정
- 감정 데이터 저장

하지만 현재 UI는 여전히:

- 말풍선 중심
- 텍스트 중심
- 캐릭터는 보조 요소

즉, 판단은 바뀌었지만 경험은 바뀌지 않았다.

> ❗ 단단이가 "결정만 하는 존재"이고,  
> ❗ 화면에는 여전히 "텍스트만 보인다"

---

## 결정

Dandani V2는 Character Scene 기반 렌더링 구조로 UI를 재구성한다.

### 핵심 정의

> Character Scene =  
> "단단이의 상태 + 환경 + 행동이 하나로 표현된 화면 단위"

---

## 구조

```
User Input → Emotion Vector → Action Type
→ Character Scene 선택 → Action UI Component 선택
→ Scene 기반 UI Render
```

---

## 1. Scene 중심 UI 구조

**기존:**
```
캐릭터 아이콘 + 말풍선 + 텍스트 + 버튼
```

**변경:**
```
[Character Scene (전체 화면의 60~70%)]
  ↓ overlay
짧은 문장 1줄
  ↓
Action UI Component
```

> 캐릭터는 "아이콘"이 아니라 UI의 중심 레이어가 된다

---

## 2. Character Scene 구성 요소

각 Scene은 다음을 포함한다:

```json
{
  "scene_id": "calm_breathing_room",
  "character": "breathing_dandani",
  "environment": "cozy_room_morning",
  "emotion": "CALM",
  "action_type": "CALM",
  "image": "/scenes/calm_breathing_room.png",
  "animation": "breathing_loop",
  "default_text": "같이 천천히 해볼까"
}
```

---

## 3. Scene 카테고리

### Emotion Scene (상태 표현)

| emotion | scene |
|---------|-------|
| TIRED | 호흡 단단이 (편안한 방) |
| CALM | 독서 단단이 |
| ANXIOUS | 눈 감고 있는 단단이 |
| IRRITATED | 일기 단단이 |
| EMPTY | 멍 때리는 단단이 |

### Action Scene (행동 유도)

| action_type | scene |
|-------------|-------|
| START | 코딩 단단이 |
| FOCUS | 작업 단단이 |
| MOVE | 산책/등산 단단이 |
| RELEASE | 일기 단단이 |
| REFLECT | 캠핑 단단이 |

---

## 4. Scene 선택 규칙

```
Emotion Vector → Emotion 우선 판단 → Action Type 결정
→ Scene 선택
```

- Rule 1: energy LOW → Emotion Scene 우선
- Rule 2: intent 존재 → Action Scene
- Rule 3: 강한 감정 → Emotion Scene 먼저

---

## 5. Scene + Action UI 결합

각 Scene 위에 Action UI Component를 overlay로 배치한다.

**예: CALM**
```
[호흡 단단이 Scene]
"같이 천천히 해볼까"
  ↓
BreathingAction (애니메이션)
```

**예: START**
```
[코딩 단단이 Scene]
"딱 시작만 해보자"
  ↓
Countdown UI
```

**예: RELEASE**
```
[일기 단단이 Scene]
"한 줄만 꺼내보자"
  ↓
텍스트 입력
```

---

## 6. 말풍선 제거 정책

**기존:** 말풍선 중심, 텍스트 다수

**변경:** 말풍선 제거 또는 최소화, 텍스트는 1줄만 허용

```
"같이 해볼까"
```

> 캐릭터가 이미 상태를 전달하기 때문

---

## 7. Scene 전환 흐름

```
Idle Scene (기본 상태)
→ Input
→ Scene Transition
→ Action Scene
→ Result Scene
→ Reflection Scene
```

---

## 8. Result Scene

결과도 Scene으로 표현한다:

**성공:**
```
단단이 웃음 / 편안한 상태
"괜찮아졌네"
```

**실패:**
```
단단이 조용히 앉아 있음
"괜찮아. 다시 해보자"
```

---

## 9. Scene 다양성 확장

같은 Action Type도 Scene 다양화:

```json
{
  "calm": ["비 오는 방", "햇살 방", "숲 속", "밤 조용한 방"]
}
```

반복 사용 시 지루함 감소, 감정 몰입 증가.

---

## 10. 구현 우선순위

**Phase 1:**
- CALM → 호흡 단단이 Scene
- RELEASE → 일기 단단이 Scene
- START → 코딩 단단이 Scene

**Phase 2:**
- MOVE / FOCUS / REFLECT Scene
- Scene Variation
- Animation 추가

---

## 11. 결과 기대

- 실행률 증가
- 몰입도 증가
- 캐릭터 인지 강화

```
텍스트 앱 → 감정 경험 앱
```

---

## 한 줄 정리

> 단단이는 말하는 존재가 아니라  
> 상태와 행동을 장면으로 보여주는 존재다
