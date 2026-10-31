// UTM 파라미터 파싱 유틸리티

/**
 * UTM 파라미터 타입 정의
 * @typedef {Object} UTM
 * @property {string|undefined} utm_source
 * @property {string|undefined} utm_medium
 * @property {string|undefined} utm_campaign
 */

/**
 * URL에서 UTM 파라미터를 파싱합니다.
 * @param {string} url - 파싱할 URL
 * @returns {UTM} UTM 파라미터 객체
 */
export function getUTMFromURL(url) {
  try {
    const u = new URL(url);
    const p = u.searchParams;

    const utm_source = p.get('utm_source') ?? undefined;
    const utm_medium = p.get('utm_medium') ?? undefined;
    const utm_campaign = p.get('utm_campaign') ?? undefined;

    // 빈 문자열 방지 및 trim 처리
    const clean = (v) => (v && v.trim().length > 0 ? v.trim() : undefined);

    return {
      utm_source: clean(utm_source),
      utm_medium: clean(utm_medium),
      utm_campaign: clean(utm_campaign),
    };
  } catch (error) {
    // URL 파싱 실패 시 빈 객체 반환
    console.debug('[UTM] Failed to parse URL:', error);
    return {
      utm_source: undefined,
      utm_medium: undefined,
      utm_campaign: undefined,
    };
  }
}

/**
 * UTM 파라미터 중 하나라도 존재하는지 확인합니다.
 * @param {UTM} utm - 확인할 UTM 객체
 * @returns {boolean} UTM 파라미터가 하나라도 존재하면 true
 */
export function hasAnyUTM(utm) {
  return Boolean(utm.utm_source || utm.utm_medium || utm.utm_campaign);
}
