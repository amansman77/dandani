// PostHog Person 속성으로 first_utm_* 저장 유틸리티
// 최초 1회만 저장하기 위해 set_once를 사용하며, 로컬스토리지로 중복 호출을 방지합니다.
// URL에 UTM이 없어도 Capacitor(iOS/Android) 앱이면 utm_source=ios_app|android_app 로 저장합니다.

import { getUTMFromURL, hasAnyUTM } from './utm';
import { getAppUtmFromCapacitor } from './execution-platform';

const STORAGE_KEY = 'dandani:first_utm_written';

/**
 * PostHog Person 속성으로 first_utm_* 값을 저장합니다.
 * - set_once를 사용하여 이미 값이 있으면 덮어쓰지 않습니다.
 * - URL에 UTM이 있으면 URL 기준, 없으면 Capacitor 앱일 때 ios_app/android_app 으로 저장합니다.
 */
export function writeFirstUTMOnce() {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    // 1) URL에서 UTM 파싱, 없으면 Capacitor 앱일 때 앱 UTM 사용 (ios_app / android_app)
    let utm = getUTMFromURL(window.location.href);
    if (!hasAnyUTM(utm)) {
      const appUtm = getAppUtmFromCapacitor();
      if (appUtm && hasAnyUTM(appUtm)) {
        utm = appUtm;
      } else {
        return;
      }
    }

    // 2) 중복 실행 가드 (로컬스토리지 확인)
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      // 이미 저장했으면 중복 호출 방지
      return;
    }

    // 3) PostHog가 초기화되었는지 확인
    if (!window.posthog) {
      // PostHog가 아직 초기화되지 않았으면 잠시 후 재시도 (최대 3초)
      const maxWaitTime = 3000;
      const checkInterval = 100;
      let elapsed = 0;

      const tryWrite = () => {
        if (window.posthog) {
          // PostHog가 준비되었으면 저장 시도
          writeFirstUTMOnce();
          return true;
        }
        return false;
      };

      // 즉시 시도
      if (tryWrite()) {
        return;
      }

      // PostHog 초기화 대기
      const intervalId = setInterval(() => {
        elapsed += checkInterval;
        if (tryWrite() || elapsed >= maxWaitTime) {
          clearInterval(intervalId);
          if (elapsed >= maxWaitTime) {
            console.warn('[PostHog First UTM] PostHog initialization timeout, skipping first_utm_* save');
          }
        }
      }, checkInterval);
      return;
    }

    // 4) set_once로 Person 속성 저장
    // set_once는 이미 값이 있으면 덮어쓰지 않으므로 안전하게 호출 가능
    window.posthog.people.set_once({
      first_utm_source: utm.utm_source,
      first_utm_medium: utm.utm_medium,
      first_utm_campaign: utm.utm_campaign,
    });

    // 5) 가드 기록 (중복 호출 방지)
    localStorage.setItem(STORAGE_KEY, '1');

    console.log('[PostHog First UTM] Saved first_utm_* properties:', {
      first_utm_source: utm.utm_source,
      first_utm_medium: utm.utm_medium,
      first_utm_campaign: utm.utm_campaign,
    });
  } catch (error) {
    // 실패해도 사용자 경험에 영향 없게 (silent fail)
    console.debug('[PostHog First UTM] Failed to save first_utm_* properties:', error);
  }
}
