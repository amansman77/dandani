# ADR-0006: 단단이 UTM 표준 및 PostHog 저장 전략

## Status
Accepted  
2026-01-21

## Context

단단이는 다양한 경로를 통해 사용자가 유입된다.

- QR 코드 (명함, 티셔츠)
- 포트폴리오 페이지
- 직접 URL 전달
- iOS / Android 앱 진입
- Instagram
- X

서비스의 핵심 지표는 단순 유입이 아니라 **유입 이후 실제 실천(Activation)** 이며,  
이를 위해서는 **Acquisition → Activation을 연결할 수 있는 유입 메타 정보**가 필요하다.

PostHog를 주요 분석 도구로 사용하고 있으며,  
Activation / Retention / Funnel 분석은 **Person(사람) 기준**으로 수행된다.

따라서 단단이에서는 UTM을 단순 이벤트 속성이 아닌  
**사용자의 유입 기원을 설명하는 기준 정보**로 취급할 필요가 있다.

## Decision

### 1. UTM의 역할 정의

UTM은 다음을 의미한다.

> 사용자가 단단이에 **어떤 경로와 맥락으로 처음 유입되었는지**를 설명하는 메타 정보

UTM은 Acquisition 단계의 정보이며,  
Activation 및 이후 행동 데이터를 해석하기 위한 **기준점(anchor)** 으로 사용한다.

### 2. UTM 저장 위치

UTM은 PostHog의 **Person 속성**으로 저장한다.

- 이벤트(Event) 속성으로는 사용하지 않는다
- 사람 기준 분석을 가능하게 하기 위함이다

### 3. 저장되는 UTM 속성

다음 속성만을 사용한다 (MVP 기준).

- `first_utm_source`
- `first_utm_medium`
- `first_utm_campaign`

선택적으로 사용 가능한 속성 (`utm_content`, `utm_term`)은  
현 단계에서는 저장하지 않는다.

### 4. 저장 규칙 (중요)

- UTM은 **최초 1회만 저장**한다
- PostHog의 `posthog.people.set_once()`를 사용한다
- 이후 재유입이나 다른 UTM 링크 접근 시에도 **덮어쓰지 않는다**

즉,

> 단단이는 사용자의 모든 이후 행동을  
> **최초 유입 맥락(first-touch)** 기준으로 해석한다.

### 5. 저장 타이밍

- 최초 진입 시 (첫 pageview 기준)
- PostHog 초기화 이후 실행

가입/로그인 이전 단계에서도 저장을 허용하며,  
익명 사용자 → 로그인 사용자 병합 시에도  
`first_utm_*` 속성은 유지되는 것을 전제로 한다.

### 6. 중복 호출에 대한 정책

- `posthog.people.set_once()`는 사람 기준 멱등 연산이므로  
  중복 호출되어도 데이터 정합성에는 문제가 없다
- 로컬스토리지는 **중복 호출을 줄이기 위한 보조 수단**으로만 사용한다
- 1회 기록의 최종 보장은 PostHog가 담당한다

### 7. 단단이 UTM 표준 값

#### utm_source (유입 출처)

| 유입 경로 | 값 |
|---|---|
| QR 코드 | `qr` |
| 포트폴리오 페이지 | `portfolio` |
| 직접 URL 전달 | `direct` |
| iOS 앱 | `ios_app` |
| Android 앱 | `android_app` |
| Instagram | `instagram` |
| X | `x` |

#### utm_medium (유입 방식)

| 유형 | 값 |
|---|---|
| 오프라인 | `offline` |
| 소유 채널 | `owned` |
| 직접 유입 | `direct` |
| 앱 | `app` |
| 소셜 | `social` |

#### utm_campaign (유입 맥락)

| 상황 | 값 |
|---|---|
| 명함 QR | `business_card` |
| 티셔츠 QR | `tshirt` |
| 포트폴리오 메인 | `portfolio_main` |
| 개인 전달 | `personal_share` |
| 앱 기본 진입 | `app_entry` |
| 인스타 프로필 | `instagram_profile` |
| X 프로필 | `x_profile` |

## Consequences

### 긍정적 결과

- Acquisition → Activation 퍼널이 사람 기준으로 연결된다
- 유입 경로별 실천율, 유지율 분석이 가능해진다
- UTM 설계가 단순하며 확장 가능하다
- PostHog의 분석 모델(Person 중심)과 정합성이 맞는다

### 제한 사항

- last-touch, 멀티터치 어트리뷰션은 지원하지 않는다
- UTM이 없는 direct 유입은 별도 보완 전략이 필요하다
- 광고 플랫폼 단위의 정밀 귀속은 범위 밖이다

## Notes

- 본 ADR은 단단이 MVP 단계의 기준이며,
  향후 유입 규모 확대 시 `last_utm_*` 또는 referrer 기반 보완 전략을 추가할 수 있다.
- 본 결정은 GA4 설정과 독립적이며,
  GA4는 참고 지표용으로만 사용한다.
