// 피벗 이전 챌린지의 날짜 계산. 활성 코드는 쓰지 않는다 — 문장 되새기기의
// 날짜는 phrase-dates.js가 맡는다. legacy/challenge-service.js와
// legacy/practice-service.js만 이 파일을 import한다(ADR-0005).

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getClientLocalDate(clientTime, clientTimezone) {
  const fallbackDate = new Date();
  const baseDate = clientTime ? new Date(clientTime) : fallbackDate;
  const validBaseDate = Number.isNaN(baseDate.getTime()) ? fallbackDate : baseDate;

  if (clientTimezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: clientTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(validBaseDate);

      const getPart = (type) => parts.find((part) => part.type === type)?.value;
      const year = parseInt(getPart('year'), 10);
      const month = parseInt(getPart('month'), 10);
      const day = parseInt(getPart('day'), 10);

      if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
        return new Date(Date.UTC(year, month - 1, day));
      }
    } catch (error) {
      console.warn('Invalid client timezone, fallback to UTC date:', clientTimezone);
    }
  }

  return new Date(Date.UTC(
    validBaseDate.getUTCFullYear(),
    validBaseDate.getUTCMonth(),
    validBaseDate.getUTCDate()
  ));
}

export function addStartedAtDateString(startedAt) {
  if (!startedAt || typeof startedAt !== 'string') {
    return '';
  }
  return startedAt.split('T')[0];
}

/**
 * @param {string | Date | number | null | undefined} value
 * @returns {Date | null}
 */
function normalizeUTCDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * @param {string | Date | number | null | undefined} startValue
 * @param {Date} currentDate
 * @param {number} totalDays
 */
export function calculateChallengeDayFromStart(startValue, currentDate, totalDays) {
  const normalizedStart = normalizeUTCDate(startValue);
  if (!normalizedStart || !currentDate) {
    return 1;
  }

  const diffDays = Math.floor((currentDate.getTime() - normalizedStart.getTime()) / MS_PER_DAY);
  const rawDay = diffDays + 1;
  const safeTotalDays = Math.max(1, totalDays || 1);

  if (!Number.isFinite(rawDay)) {
    return 1;
  }

  if (rawDay < 1) {
    return 1;
  }

  if (rawDay > safeTotalDays) {
    return safeTotalDays;
  }

  return rawDay;
}
