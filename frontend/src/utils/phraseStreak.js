const VISIBLE_DAYS = 7;

function dateDaysAgo(today, offset) {
  // Work on a calendar date, not elapsed 24-hour periods across DST boundaries.
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

export function getRollingWeekTicks(loggedDates, today = new Date().toLocaleDateString('en-CA')) {
  const recorded = new Set(loggedDates || []);
  let offset = recorded.has(today) ? 0 : 1;
  let filled = 0;
  while (filled < VISIBLE_DAYS && recorded.has(dateDaysAgo(today, offset))) {
    filled += 1;
    offset += 1;
  }
  return Array.from({ length: VISIBLE_DAYS }, (_, index) => index < filled);
}
