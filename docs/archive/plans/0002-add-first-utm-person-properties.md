# plan: first_utm_* 저장 로직 추가 (Dandani Front + PostHog)

## 목표
포트폴리오/QR/소셜 등 UTM이 포함된 URL로 유입된 사용자의 UTM 정보를
PostHog의 **Person 속성**으로 `first_utm_*` 형태로 **최초 1회만 저장**한다.

- 저장 대상: `first_utm_source`, `first_utm_medium`, `first_utm_campaign`
- 저장 규칙: **set_once** (이미 값이 있으면 덮어쓰기 금지)
- 저장 타이밍: **최초 진입 시(page load 직후)**, PostHog 초기화 이후

> 현재 PostHog는 `Latest UTM *`을 자동 수집하고 있으나,
> 분석(Activation/Retention) 기준을 고정하기 위해 `first_utm_*`를 별도로 저장한다.

## 범위
### In-scope
- 프론트에서 URL querystring의 `utm_*` 파라미터 파싱
- PostHog People 속성으로 `set_once` 호출
- 중복 호출 방지(클라이언트 로컬 가드)
- 테스트/검증 가이드 포함

### Out-of-scope
- last-touch/멀티터치 어트리뷰션 설계
- 서버사이드 저장/동기화
- GA4 연동 변경

## 데이터 스펙
### 입력 (URL query)
- `utm_source`
- `utm_medium`
- `utm_campaign`
- (옵션) `utm_content`, `utm_term` — 현재는 저장하지 않음

### 출력 (PostHog Person properties)
- `first_utm_source`
- `first_utm_medium`
- `first_utm_campaign`

## 설계 원칙
1. **최초 1회만 기록**
   - `posthog.people.set_once({ ... })` 사용
2. **UTM이 존재할 때만 기록**
   - `utm_source|utm_medium|utm_campaign` 중 하나라도 존재하면 저장 시도
3. **중복/재실행 방지**
   - 로컬스토리지 키로 1차 가드 (e.g. `dandani:first_utm_written=1`)
   - 단, 로컬 가드는 “불필요한 호출 감소” 목적이며 최종 방어는 `set_once`가 담당
4. **개인정보/민감정보 저장 금지**
   - UTM 값은 캠페인 식별자 수준으로만 사용 (이메일/전화번호 등 포함 금지)

## 구현 방안 (권장)
### A. 클라이언트 진입 시 1회 실행 (권장)
- 앱 시작/첫 페이지 진입 시점(예: App root / Layout / Router 진입 후)에서 실행
- PostHog 초기화가 완료된 뒤 실행

## 구현 상세 (의사코드)
> 프레임워크(Next.js/React Router 등)에 맞춰 lifecycle만 맞추면 됨

```ts
// utm.ts
type UTM = {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

function getUTMFromURL(url: string): UTM {
  const u = new URL(url)
  const p = u.searchParams

  const utm_source = p.get('utm_source') ?? undefined
  const utm_medium = p.get('utm_medium') ?? undefined
  const utm_campaign = p.get('utm_campaign') ?? undefined

  // 빈 문자열 방지
  const clean = (v?: string) => (v && v.trim().length > 0 ? v.trim() : undefined)

  return {
    utm_source: clean(utm_source),
    utm_medium: clean(utm_medium),
    utm_campaign: clean(utm_campaign),
  }
}

function hasAnyUTM(utm: UTM) {
  return Boolean(utm.utm_source || utm.utm_medium || utm.utm_campaign)
}
````

```ts
// posthog-first-utm.ts
import posthog from 'posthog-js'

const STORAGE_KEY = 'dandani:first_utm_written'

export function writeFirstUTMOnce() {
  try {
    // 1) UTM 파싱
    const utm = getUTMFromURL(window.location.href)
    if (!hasAnyUTM(utm)) return

    // 2) 중복 실행 가드 (선택)
    if (localStorage.getItem(STORAGE_KEY) === '1') return

    // 3) set_once로 Person 속성 저장
    posthog.people.set_once({
      first_utm_source: utm.utm_source,
      first_utm_medium: utm.utm_medium,
      first_utm_campaign: utm.utm_campaign,
    })

    // 4) 가드 기록
    localStorage.setItem(STORAGE_KEY, '1')
  } catch (e) {
    // 실패해도 사용자 경험에 영향 없게 (silent fail)
    // 필요 시 console.warn 정도만
  }
}
```

```ts
// app entry (예시)
useEffect(() => {
  // posthog init 이후 호출 보장
  writeFirstUTMOnce()
}, [])
```

## 주의사항 / 엣지 케이스

1. **이미 first_utm_*가 존재하는 사용자의 경우**

   * `set_once` 특성상 덮어쓰지 않음 → 기대 동작
2. **UTM이 없는 direct 유입**

   * 아무 것도 저장하지 않음 → 기대 동작
3. **SPA 라우팅에서 query가 제거되는 경우**

   * 최초 로드 순간에만 읽으면 충분
4. **앱(WebView)에서 딥링크로 전달되는 UTM**

   * URL에 UTM이 실제로 포함되는지 확인 필요
5. **값 길이/문자**

   * 소문자/언더스코어 권장 (캠페인 네이밍 컨벤션은 별도 문서로 관리)

## 검증 시나리오 (PostHog UI)

### 1) 시크릿 창 테스트

* 아래 URL로 진입:

  * `https://dandani.yetimates.com/?utm_source=portfolio&utm_medium=owned&utm_campaign=portfolio_main`
* PostHog → **Live Events**에서 이벤트 클릭 → **Person Properties** 확인
* 아래 키가 존재해야 함:

  * `first_utm_source=portfolio`
  * `first_utm_medium=owned`
  * `first_utm_campaign=portfolio_main`

### 2) 재방문(UTM 변경) 테스트

* 같은 브라우저에서 다른 UTM 링크로 재유입:

  * `...?utm_source=x&utm_medium=social&utm_campaign=x_profile`
* 기대 결과:

  * `Latest UTM *`는 변경될 수 있음
  * `first_utm_*`는 **변경되지 않아야 함**

### 3) Insights 검증

* PostHog Insights → Trends
* Event: `practice_completed`
* Breakdown: Person property `first_utm_source`
* `portfolio` 그룹이 존재하면 성공

## 완료 조건 (DoD)

* [ ] UTM 유입 시 `first_utm_*` 3개가 Person 속성으로 저장됨
* [ ] 재방문/다른 UTM 유입에도 `first_utm_*`는 유지됨
* [ ] Live Events/People/Insights에서 확인 가능
* [ ] 오류가 사용자 UX를 방해하지 않음 (silent fail)
