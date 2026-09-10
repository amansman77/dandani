import { getRollingWeekTicks } from './phraseStreak';

const nativeFormat = Date.prototype.toLocaleDateString;
function setLocalClock(instant, timezone) {
  jest.useFakeTimers().setSystemTime(new Date(instant));
  jest.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(function (locale) {
    return nativeFormat.call(this, locale, { timeZone: timezone });
  });
}

afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test('spring DST transition does not skip yesterday in the streak', () => {
  setLocalClock('2026-03-09T04:30:00Z', 'America/New_York');
  expect(getRollingWeekTicks(['2026-03-09', '2026-03-08', '2026-03-07']))
    .toEqual([true, true, true, false, false, false, false]);
});

test('fall DST transition does not count the same date twice', () => {
  setLocalClock('2026-11-01T23:30:00-05:00', 'America/New_York');
  expect(getRollingWeekTicks(['2026-11-01', '2026-10-31']))
    .toEqual([true, true, false, false, false, false, false]);
});

test('yesterday is allowed before logging today, gaps reset the streak', () => {
  setLocalClock('2026-09-10T15:30:00Z', 'Asia/Seoul');
  expect(getRollingWeekTicks(['2026-09-10', '2026-09-09', '2026-09-07']))
    .toEqual([true, true, false, false, false, false, false]);
  expect(getRollingWeekTicks(['2026-09-09'])).toEqual(Array(7).fill(false));
});
