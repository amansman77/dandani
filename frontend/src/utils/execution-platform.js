/**
 * Capacitor 네이티브 앱일 때 UTM 값 (ADR-0004: ios_app / android_app)
 * utm_source=ios_app | android_app, utm_medium=app
 */

/**
 * Capacitor 네이티브 앱(iOS/Android)일 때 first_utm_* 에 쓸 UTM 객체를 반환합니다.
 * 브라우저 또는 WebView가 아닌 경우 null을 반환합니다.
 * @returns {{ utm_source: 'ios_app'|'android_app', utm_medium: string } | null}
 */
export function getAppUtmFromCapacitor() {
  if (typeof window === 'undefined') {
    return null;
  }

  const cap = window.Capacitor;
  if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) {
    return null;
  }

  const p = typeof cap.getPlatform === 'function' ? cap.getPlatform() : '';
  const utm_source = p === 'ios' ? 'ios_app' : p === 'android' ? 'android_app' : null;
  if (!utm_source) {
    return null;
  }

  return {
    utm_source,
    utm_medium: 'app',
  };
}
