# Experiment v2 — "7-Day Recovery Loop"

**Version:** v2.0
**Date:** 2025.11
**Owner:** Product Manager (사용자)

---

# 1. 실험 목적 (Primary Goal)

### **가설 (PMF Hypothesis)**

> **“사용자가 공감하는 짧은 실천을 직접 선택하면, 실천 행동으로 이어지고, 그 행동은 잔존을 만든다.”**

### 이번 실험 v2의 *핵심 목적*

1. **광고 문구 → 챌린지 선택**이 실제로 일어나는지 검증
2. **선택된 챌린지가 실천까지 이어지는지** 검증
3. **실천 후 다음날/7일cycle 안에서 재방문이 일어나는지** 확인

---

# 2. 실험 구성요소 (Experiment Components)

이번 실험은 3개의 핵심 루프를 검증한다:

### ① 공감 루프: **광고 문구 → 챌린지 선택**

* 특정 문구가 사용자 공감을 일으키는지 확인
* 선택 행위 = 공감 신호로 간주한다

### ② 행동 루프: **챌린지 선택 → 실천 완료**

* 공감이 행동(실천)까지 실제로 이어지는지 관찰

### ③ 유지 루프: **실천 경험 → 다음날/7일 내 재방문**

* 행동 경험이 잔존 패턴을 만드는지 확인

---

# 3. 실험 플로우 (Experiment Flow)

```
[Instagram Ad]  
   ↓ (click)
[Landing + Challenge Select Screen]  
   ↓ (user selects one challenge → 공감)  
[Challenge Detail + “실천 완료”]  
   ↓ (behavior signal)  
[Completion Screen]  
   ↓ (24h waiting)  
[Day2/Day3 Return 여부 체크]  
```

---

# 4. 실험 조건 (What stays fixed)

* **챌린지는 모두 "짧고 쉬운 난이도"로 구성**
* **하루 실천만 요구 (1-minute tasks)**
* **선택형 챌린지 UI 도입**
* **7일 루프 기반이지만 v2는 Day2~3 패턴 중심으로 관찰**

---

# 5. 실험 대상 (Traffic Source)

### 주 유입: **Instagram 광고**

* 광고 소재에 **구체적인 실천 문구** 포함
* 광고 문구와 동일한 실천 챌린지가 선택 화면의 첫 번째 실천으로 위치

---

# 6. 실험 챌린지 (Example)

광고 문구와 1:1로 매칭할 **“초간단 실천”**들

* “걱정을 10자로 적어보는 1분 루틴”
* “오늘 감정 한 단어로 적기”
* “눈 감고 3초 동안 호흡 멈추기”
* “내가 오늘 잘한 점 1개 적기”
* “지금 어깨 3초만 풀어보기”

**핵심 요건:**
실천 난이도는 **극도로 낮고**
사용자가 **즉시 할 수 있는 행동**이어야 함.

---

# 7. 실험 지표 (KPI)

## ① 공감 지표 (Empathy Proxy)

**Challenge Selection Rate (CSR)**
공고 클릭 → 선택 화면 진입 →
광고에 나온 챌린지를 실제로 선택한 비율

* 목표: **≥ 30%**

선택 = 공감 신호로 간주.

---

## ② 행동 지표 (Completion KPI)

**Practice Completion Rate (PCR)**
선택한 챌린지 → 실천 완료 클릭

* 목표: **≥ 50%**

실천 완료는 공감 이후의 행동 신호.

---

## ③ 잔존 지표 (Retention KPI)

### Day2 Return Rate

실천 다음날 다시 방문한 비율

* 목표: **≥ 20%**

### Day3 Return Rate

연속 방문 여부

* 목표: **≥ 10%**

(7-Day는 v3에서 전체 실험으로 확장)

---

# 8. 데이터 정의 (Event Specification)

### 1) CHALLENGE_SELECTED

* user_id
* challenge_id
* source: “instagram_ad_2025_11_v2”
* timestamp

### 2) CHALLENGE_COMPLETED

* user_id
* challenge_id
* timestamp

### 3) PAGE_VISIT

* user_id
* page: “home/select/practice/completion”
* timestamp

### 4) RETURN_VISIT

* user_id
* day_index: 1/2/3
* timestamp

**공감도 버튼 없음.**
**선택 행위가 공감도 신호.**

---

# 9. 성공 조건 (Success Criteria)

이 실험이 성공했다고 판단하려면 아래 조건을 충족해야 함.

| 구분 | 지표                       | 목표치   |
| -- | ------------------------ | ----- |
| 공감 | Challenge Selection Rate | ≥ 30% |
| 행동 | Practice Completion Rate | ≥ 50% |
| 잔존 | Day2 Retention           | ≥ 20% |
| 잔존 | Day3 Retention           | ≥ 10% |

---

# 10. 실패 조건 (Fail Criteria)

아래 중 하나라도 충족하면 v2는 실패한 것으로 간주.

* 광고 → 챌린지 선택률 < 20%
* 선택된 챌린지의 실천 완료율 < 35%
* Day2 Retention < 10%
* 유입 대비 실질 사용자 수 과도하게 적음
* 특정 챌린지에 선택 편향이 아예 없음 (공감 실패)

---

# 11. 실험 설계 철학

* **최소한의 움직임**으로
* **유입 → 공감 → 행동 → 잔존**Flow를 검증하는 것이 목적
* 복잡한 기능(AI, 감정 분석, 다단계 온보딩) 제거
* 모든 지표는 **광고 문구 기반 공감**을 검증하는 데 필요한 최소 지표만 사용
* 실험 기간은 7일이지만, v2는 Day1~Day3를 핵심 검증 기간으로 둔다

---

# 12. UI/UX 요구사항 (Minimal)

### 선택 화면

* 상단에 “오늘 하고 싶은 작은 실천을 골라보세요”
* 광고 문구와 동일한 챌린지 **맨 앞** 배치
* 하루 3~5개의 챌린지 제공

### 실천 완료 화면

* “좋아요! 오늘 실천 완료했어요”
* 추가 UI 없음
* 공감도 버튼 없음

---

# 13. 릴리즈 및 운영 프로세스

1. 선택형 챌린지 UI 개발
2. 광고 문구와 실천 매칭
3. Cloudflare Worker에 이벤트 로깅 추가
4. Discord 실험 리포트 템플릿 제작
5. 실험 시작(Instagram 유입)
6. 실험 종료(3~5일)
7. 데이터 취합
8. 가설 검증
9. 결과 ADR 작성 → v3 설계로 넘어가기

---

# 14. Deliverables (산출물)

* 선택형 챌린지 UI
* 인스타 광고용 실천 문구 3~5개
* 이벤트 트래킹 코드
* 실험 결과 리포트
* Experiment v2 ADR
* PM 해석 및 다음 가설(v3)

---

# 15. 비고

* v2는 “공감 기반 선택” 가설 검증이 목적
* 실패하더라도 “어떤 실천 문구가 공감되는지”라는 가장 중요한 인사이트 확보 가능
