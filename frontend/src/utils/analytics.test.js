import { getUserId, getUserIdInfo } from './userId';

let analytics;

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  delete window.posthog;
  global.fetch = jest.fn().mockResolvedValue({ ok: true });
  jest.spyOn(Date, 'now').mockReturnValue(1789038000000);
  jest.spyOn(Math, 'random').mockReturnValue(0.25);
  analytics = require('./analytics');
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete global.fetch;
});

test('first visit and later phrase events use the same stored user without PostHog', async () => {
  analytics.initAnalytics();
  const [, visit] = fetch.mock.calls[0];
  expect(visit.headers['X-User-ID']).not.toBe('anonymous');
  expect(visit.headers['X-User-ID']).toBe(getUserId());
  expect(getUserIdInfo().isNew).toBe(true);
  await analytics.logEvent('phrase_day_logged', { phrase_id: 'phrase-test' });
  expect(fetch.mock.calls[1][1].headers['X-User-ID']).toBe(visit.headers['X-User-ID']);
});

test('returning user and repeated initialization produce one visit', () => {
  localStorage.setItem('dandani_user_id', 'existing-user');
  analytics.initAnalytics();
  analytics.initAnalytics();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][1].headers['X-User-ID']).toBe('existing-user');
});

test('an unavailable analytics endpoint does not reject the user action', async () => {
  fetch.mockRejectedValue(new TypeError('offline'));
  await expect(analytics.logEvent('phrase_shared', { method: 'copy' })).resolves.toBeUndefined();
  expect(localStorage.getItem('dandani_user_id')).toBeTruthy();
});

test('PostHog capture failure does not prevent the backend visit', () => {
  window.posthog = { identify: jest.fn(), capture: () => { throw new TypeError('blocked'); } };
  analytics.initAnalytics();
  expect(fetch).toHaveBeenCalledTimes(1);
});


test('a fresh visit and phrase creation send the same generated identity', async () => {
  fetch.mockResolvedValue({ ok: true, json: async () => ({ id: 'created-phrase' }) });
  const { savePhrase } = require('./phraseApi');
  expect(localStorage.getItem('dandani_user_id')).toBeNull();
  analytics.initAnalytics();
  await savePhrase('처음 적는 문장');
  const [[visitUrl, visit], [createUrl, create]] = fetch.mock.calls;
  expect(visitUrl).toMatch(/\/api\/analytics\/event$/);
  expect(JSON.parse(visit.body).event_type).toBe('page_visit');
  expect(createUrl).toMatch(/\/api\/phrases$/);
  expect(JSON.parse(create.body)).toEqual({ phrase: '처음 적는 문장' });
  const userId = localStorage.getItem('dandani_user_id');
  expect(userId).toMatch(/^user_/);
  expect(visit.headers['X-User-ID']).toBe(userId);
  expect(create.headers['X-User-ID']).toBe(userId);
});
