# ADR-PROD-007 Pattern Learning Strategy

## 상태
제안

---

## 맥락

Dandani V2의 핵심 정의:

> suggests a small actionable step  
> based on a user's current emotion and past behavior

하지만 현재 시스템은 다음 상태에 머물러 있다:

```
State → Action → Response → Store
```

문제:
> ❗ 과거 행동 데이터가 저장되지만  
> ❗ 다음 행동 선택에 영향을 주지 않는다

그 결과:
- 동일한 상태 → 동일한 행동 반복
- 사용자 입장에서 개인화 체감 없음

핵심 질문:
> "사용자의 과거 반응이 어떻게 다음 행동을 바꾸는가?"

---

## 결정

Dandani는 Action Type 단위로 성공/실패 패턴을 학습하고,
다음 행동 선택에 직접 반영한다.

> Pattern Learning =  
> 특정 사용자에게 어떤 행동 타입이 효과적인지를  
> 반복된 결과 데이터를 통해 학습하는 과정

---

## 1. 데이터 구조

```json
{
  "user_id": "123",
  "action_patterns": {
    "CALM": { "success": 1, "fail": 3 },
    "MOVE": { "success": 2, "fail": 0 }
  }
}
```

---

## 2. 결과 해석

| 사용자 선택 | success | fail |
|------------|---------|------|
| 해냈어 | +1 | 0 |
| 조금 했어 | +0.5 | +0.5 |
| 못했어 | 0 | +1 |

---

## 3. 성공률 계산

```
success_rate = success / (success + fail)
```

---

## 4. 선택 로직

**기존:**
```
Emotion → Action Type
```

**변경:**
```
Emotion + Pattern → Action Type
```

---

## 5. 필터링 규칙

### Rule 1: 실패 많은 행동 제거
```
if success_rate < 0.3:
    해당 Action Type 우선순위 하락
```

### Rule 2: 성공 높은 행동 강화
```
if success_rate > 0.7:
    해당 Action Type 우선 선택
```

---

## 6. 동작 예시

**초기:** 피곤 → CALM

**반복 실패:** CALM → 못했어 (3회) → success_rate = 0.0

**변화:** 피곤 → MOVE 선택

**성공:** MOVE → 해냈어 (2회) → success_rate = 1.0

**이후:** 피곤 → MOVE 유지

---

## 7. Cold Start

초기에는 패턴 없음:
- Rule 기반 사용 (ADR-PROD-005의 Emotion → Action Type)
- 패턴이 쌓이면 점진적으로 대체

---

## 8. 업데이트 시점

```
Action 완료 → Result 선택 → Pattern Update
```

즉시 반영.

---

## 9. 사용자 체감 변화

**이전:** "같이 숨 쉬어보자"

**이후:** "숨 쉬는 건 잘 안 맞았지? 이번엔 잠깐 걸어보자"

👉 이 순간 개인화 인식 발생

---

## 10. 확장 방향

### Level 2
감정별 성공 패턴:
```json
{ "TIRED": "MOVE", "IRRITATED": "RELEASE" }
```

### Level 3
시간 / 상황별 패턴

---

## 11. 왜 먼저 해야 하는가

Pattern Learning이 없으면:
- Scene Rendering은 단순 시각 변화
- 개인화 체감 없음

Pattern Learning이 있으면:
- 선택 자체가 바뀜
- UI 변화 의미 생김

---

## 한 줄 정의

> 개인화는 맞추는 것이 아니라  
> 실패를 줄여가는 과정이다

## 한 줄 정리

> 단단이는 행동을 추천하는 시스템이 아니라  
> 사용자에게 맞는 행동으로 계속 바뀌는 시스템이다
