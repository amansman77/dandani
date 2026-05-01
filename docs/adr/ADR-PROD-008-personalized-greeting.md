# ADR-PROD-008 Personalized Greeting

## 상태
제안

---

## 맥락

ADR-PROD-007 Pattern Learning Strategy 구현으로 다음이 가능해졌다:
- action_type별 success / fail 누적
- 사용자 반응 기반 Action Type 변경
- 패턴 기반 개인화 메시지 생성

하지만 현재 첫 화면은 항상 동일하다:

> 왔구나. 지금 어떤 상태야?

이로 인해 사용자는 "단단이가 나를 기억하고 있다"를 체감하기 어렵다.

---

## 결정

Dandani V2는 첫 화면 인사를 고정 문구가 아니라
최근 기록과 행동 패턴을 반영한 개인화 인사로 변경한다.

> Personalized Greeting =  
> 사용자의 최근 행동 결과와 누적 패턴을 바탕으로  
> 단단이가 사용자를 알아보는 듯 시작하는 첫 문장

---

## 1. 기본 흐름

```
앱 진입
→ 최근 기록 조회
→ 행동 패턴 조회
→ Greeting Context 생성
→ 개인화 인사 렌더링
→ 현재 상태 입력
```

---

## 2. Greeting Context

```json
{
  "has_history": true,
  "last_action_type": "CALM",
  "last_result": "해냈어",
  "last_feeling": "마음이 편안해졌어",
  "best_action_type": "CALM",
  "weak_action_type": null,
  "pattern_summary": "호흡 행동에 잘 반응함"
}
```

---

## 3. 인사 유형

**1) Cold Start** — 기록이 없을 때
```
왔구나. 지금 어떤 상태야?
```

**2) Recent Recall** — 최근 기록이 있을 때
```
지난번엔 숨 고르기를 해봤지.
지금은 어떤 상태야?
```

**3) Success Recognition** — 최근 결과가 좋았을 때
```
지난번엔 마음이 조금 편해졌지.
오늘도 지금 상태부터 같이 볼까?
```

**4) Pattern Recognition** — 특정 행동 타입 성공률이 높을 때
```
요즘은 숨 고르기가 잘 맞는 것 같아.
지금은 어떤 상태야?
```

**5) Failure Recovery** — 특정 행동 타입이 반복 실패했을 때
```
지난번 방식이 잘 안 맞았지.
오늘은 조금 다르게 해볼까?
```

**6) Partial Progress** — "조금 했어"가 많을 때
```
요즘은 시작은 잘하고 있어.
오늘도 아주 작게 가볼까?
```

---

## 4. 우선순위 규칙

여러 조건이 동시에 맞을 경우 우선순위:

```
Failure Recovery
→ Pattern Recognition
→ Success Recognition
→ Partial Progress
→ Recent Recall
→ Cold Start
```

이유:
- 실패 반복은 먼저 부담을 낮춰야 함
- 성공 패턴은 강화해야 함
- 최근 기억은 최소 개인화로 사용

---

## 5. 문장 정책

- 최대 2문장
- 사용자를 평가하지 않음
- 과도한 분석 금지
- "너는 ~한 사람이야" 식의 고정 라벨 금지
- 행동을 강요하지 않음
- 마지막은 현재 상태 질문으로 연결

**좋은 예:**
```
지난번엔 숨 고르기가 잘 맞았지.
지금은 어떤 상태야?

요즘은 시작까지는 잘 가고 있어.
오늘은 얼마나 가볍게 해볼까?
```

**나쁜 예:**
```
당신은 CALM 유형에 성공률이 높습니다.
최근 실패율이 높으니 다른 행동을 추천합니다.
당신은 집중력이 부족한 편입니다.
```

---

## 6. 구현 우선순위

**Phase 1:**
- 최근 기록 1개 기반 인사
- Cold Start / Recent Recall / Success Recognition

**Phase 2:**
- action_patterns 기반 Pattern Recognition
- Failure Recovery / Partial Progress

**Phase 3:**
- 시간대 기반 인사
- 연속 방문 인사
- 캐릭터 Scene과 Greeting 연동

---

## 7. 기대 효과

- 개인화 체감 증가
- 재방문 시 관계감 형성
- "단단이가 나를 기억한다"는 인식 강화
- 첫 화면의 정적 느낌 제거

---

## 한 줄 정리

> 개인화는 행동 제안에서만 드러나는 것이 아니라,  
> 단단이가 사용자를 알아보는 첫 인사에서 시작된다.
