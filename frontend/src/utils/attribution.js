// 캠페인 유입경로(UTM) 판별 유틸리티 — URL의 UTM 파라미터를 우선 쓰고,
// 없으면 네이티브 앱(Capacitor)에서 왔다는 걸 구분하기 위해 ios_app/android_app로
// 대체한다. posthog-first-utm.js가 PostHog Person 속성에 쓰는 것과 같은 판별
// 로직이라, D1 user_events에 남는 캠페인 값과 PostHog 쪽이 서로 어긋나지 않는다.
//
// PostHog 쪽(first_utm_*)은 "브라우저당 최초 1회"만 저장하지만, 여기는 매
// page_visit마다 그대로 흘려보낸다 — 퍼널 집계 때 사용자별 첫 page_visit 행을
// 기준으로 캠페인을 붙이면 되고, 원본 이벤트 로그는 있는 그대로 남기는 게 낫다.
import { getUTMFromURL, hasAnyUTM } from './utm';
import { getAppUtmFromCapacitor } from './execution-platform';

export function getCurrentUTM() {
  if (typeof window === 'undefined') {
    return {};
  }

  const urlUtm = getUTMFromURL(window.location.href);
  if (hasAnyUTM(urlUtm)) {
    return urlUtm;
  }

  const appUtm = getAppUtmFromCapacitor();
  if (appUtm && hasAnyUTM(appUtm)) {
    return appUtm;
  }

  return {};
}

// 광고·링크를 타고 들어온 첫 진입인지. 스플래시·온보딩 같은 "들어가기 전 절차"를
// 건너뛸지 판단하는 데 쓴다.
//
// 매일 여는 사람에게 스플래시는 의식이지만, 광고를 누르고 온 사람에게는 아직
// 아무 애착이 없는 상태에서 6.5초를 기다리라는 요구다. 실제로 광고로 들어온
// 18명 중 문장을 쓴 사람이 0명이었고, 전부 스플래시 뒤에서 찍히는 두 이벤트만
// 남기고 사라졌다.
//
// URL의 UTM만 본다. Capacitor 대체값(ios_app 등)은 설치한 사람이라 해당 없다.
export function isCampaignEntry() {
  if (typeof window === 'undefined') return false;
  return hasAnyUTM(getUTMFromURL(window.location.href));
}
