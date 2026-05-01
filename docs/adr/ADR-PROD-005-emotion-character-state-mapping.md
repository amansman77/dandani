# ADR-PROD-005 Emotion → Character State Mapping

## 상태
제안

---

## 1. 맥락

현재 Dandani V2는:

- 사용자 상태 입력 있음
- Action Type 있음
- UI Component 있음
- 캐릭터 다양성 있음

하지만 아직 부족한 것:

> ❗ 어떤 상태에서 어떤 단단이가 나와야 하는가가 정의되지 않았다

지금은 매번 LLM이 랜덤하게 선택하는 구조.

앞으로: **상태 → 캐릭터 → 행동이 자동 연결되는 구조**

---

## 2. 결정

사용자의 상태를 **Emotion Vector (감정 상태)**로 해석하고,
이를 기반으로 **Character State (단단이 상태)**를 결정한다.

---

## 3. Emotion Layer 정의

사용자 입력은 자유 텍스트지만, 내부적으로는 이렇게 분류한다:

```
ENERGY (에너지): LOW | MID | HIGH
EMOTION (감정):  CALM | STRESSED | ANXIOUS | TIRED | IRRITATED | RESISTANCE | SCATTERED | EMPTY
INTENT (의지):   NONE | WEAK | STRONG
```

**예시:**

- "졸려" → `ENERGY: LOW, EMOTION: TIRED, INTENT: NONE`
- "해야 하는데 하기 싫어" → `ENERGY: LOW, EMOTION: RESISTANCE, INTENT: WEAK`

---

## 4. Character State 정의

단단이는 단순 이미지가 아니라 상태를 가진다.

### Emotion Character (상태 표현)

| 감정 상태 | 캐릭터 |
|-----------|--------|
| TIRED | 호흡 단단이 |
| CALM | 독서 단단이 |
| ANXIOUS | 눈 감고 있는 단단이 |
| IRRITATED | 일기 쓰는 단단이 |
| EMPTY | 멍 때리는 단단이 |

### Action Character (행동 유도)

| Action Type | 캐릭터 |
|-------------|--------|
| START | 코딩 단단이 |
| MOVE | 산책 단단이 |
| FOCUS | 작업 단단이 |
| RELEASE | 일기 단단이 |
| REFLECT | 캠핑 단단이 |

---

## 5. 핵심 매핑 로직

```
User Input
→ Emotion Vector 추출
→ Character Type 결정
→ Character Scene 선택
→ Action Type 선택
→ UI Render
```

---

## 6. 캐릭터 선택 규칙

**Rule 1:** 에너지가 낮으면 Emotion Character 우선
```
ENERGY = LOW → Emotion Character
```

**Rule 2:** 의지가 있으면 Action Character
```
INTENT = WEAK or STRONG → Action Character
```

**Rule 3:** 감정이 강하면 먼저 안정
```
EMOTION = ANXIOUS | IRRITATED → CALM or RELEASE 먼저
```

---

## 7. 실제 매핑 예시

**케이스 1 — "졸려"**
```json
{ "energy": "LOW", "emotion": "TIRED", "intent": "NONE" }
```
→ Character: 호흡 단단이 / Action: CALM / UI: BreathingAction

**케이스 2 — "해야 하는데 하기 싫어"**
```json
{ "energy": "LOW", "emotion": "RESISTANCE", "intent": "WEAK" }
```
→ Character: 코딩 단단이 / Action: START / UI: CountdownAction

**케이스 3 — "답답하고 짜증나"**
```json
{ "energy": "MID", "emotion": "IRRITATED", "intent": "NONE" }
```
→ Character: 일기 단단이 / Action: RELEASE / UI: OneLineInput

**케이스 4 — "집중이 안돼"**
```json
{ "energy": "MID", "emotion": "SCATTERED", "intent": "WEAK" }
```
→ Character: 작업 단단이 / Action: FOCUS / UI: Timer

---

## 8. Scene 선택까지 확장

같은 캐릭터라도 환경을 바꾼다:

```json
{
  "calm": ["비 오는 방", "햇살 들어오는 방", "조용한 숲"]
}
```

반복 사용에도 질리지 않는 효과.

---

## 9. 시스템 구조 요약

```
User Input
→ Emotion Parser
→ Emotion Vector
→ Character Selector
→ Scene Selector
→ Action Type Selector
→ UI Component Render
```

---

## 10. 왜 이 구조가 중요한가

1. 캐릭터가 "랜덤"이 아니라 "이유 있는 존재"가 됨
2. UX 일관성 확보
3. LLM 의존도 감소 — 규칙 기반으로 충분히 가능

---

## 11. 한 줄 정리

> 단단이는 감정을 해석해서  
> "지금 나와야 할 모습"으로 나타나는 존재다
