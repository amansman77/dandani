import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, request } from './helpers.mjs';

// Browser identity generation and request headers are covered by analytics.test.js.
// This contract continues from those headers through the real router to local D1.
test('a first visit and phrase creation persist the same user in D1', async t => {
  const app = await createApp(t);
  const user = 'user_fresh-browser';
  const visit = await request(app, '/api/analytics/event', {
    user, body: { event_type: 'page_visit', event_data: { page: 'app_load' } },
  });
  assert.equal(visit.status, 200);
  const created = await request(app, '/api/phrases', { user, body: { phrase: '처음 적는 문장' } });
  assert.equal(created.status, 200);
  const { results } = await app.db.prepare('SELECT user_id, event_type, event_data FROM user_events ORDER BY event_type').all();
  assert.deepEqual(results.map(row => [row.event_type, row.user_id]), [
    ['page_visit', user], ['phrase_start', user],
  ]);
  assert.equal(JSON.parse(results[1].event_data).phrase_id, created.body.id);
  const phrase = await app.db.prepare('SELECT user_id FROM daily_phrases WHERE id = ?').bind(created.body.id).first();
  assert.equal(phrase.user_id, user);
  assert.deepEqual(app.outbound, []);
});

test('invalid initial creation does not produce a phrase_start event', async t => {
  const app = await createApp(t);
  await request(app, '/api/analytics/event', { body: { event_type: 'page_visit' } });
  assert.equal((await request(app, '/api/phrases', { body: { phrase: ' ' } })).status, 400);
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS n FROM daily_phrases').first()).n, 0);
  const { results } = await app.db.prepare('SELECT event_type FROM user_events').all();
  assert.deepEqual(results, [{ event_type: 'page_visit' }]);
});

async function seedEvents(db) {
  const fixtures = [
    ['same-korean-day', 'page_visit', '2026-09-09 23:59:59'],
    ['same-korean-day', 'phrase_start', '2026-09-09 23:59:59'],
    ['same-korean-day', 'phrase_day_logged', '2026-09-09 23:59:59'],
    ['same-korean-day', 'page_visit', '2026-09-10 00:00:00'],
    ['same-korean-day', 'phrase_day_logged', '2026-09-10 00:00:00'],
    ['after-korean-midnight', 'page_visit', '2026-09-10 15:00:00'],
    ['next-utc-day', 'page_visit', '2026-09-11 00:00:00'],
  ];
  for (const fixture of fixtures) {
    await db.prepare('INSERT INTO user_events (user_id, event_type, created_at) VALUES (?, ?, ?)').bind(...fixture).run();
  }
}

test('operational snapshots and retention group by UTC, not Korean dates', async t => {
  const app = await createApp(t, { now: '2026-09-11T01:00:00Z' });
  await seedEvents(app.db);
  const options = { token: 'local-test-token', timezone: 'Asia/Seoul' };
  const report = await request(app, '/api/analytics/daily-report?date=2026-09-10', options);
  assert.equal(report.status, 200);
  assert.deepEqual(report.body.daily_snapshot, {
    date: '2026-09-10', visitors: 2, phrases_started: 0, phrases_logged_users: 1, phrases_retired: 0,
  });
  assert.equal(report.body.funnel_30d.retained_2plus, 1);
  const activity = await request(app, '/api/analytics/activity?days=30', options);
  assert.equal(activity.status, 200);
  assert.deepEqual(activity.body.daily_active_users.map(row => [row.activity_date, row.active_users]), [
    ['2026-09-11', 1], ['2026-09-10', 2], ['2026-09-09', 1],
  ]);
  const utcReport = await request(app, '/api/analytics/daily-report?date=2026-09-10', { ...options, timezone: 'UTC' });
  assert.deepEqual(utcReport.body, report.body);
  assert.deepEqual(app.outbound, []);
});

for (const [now, yesterday] of [
  ['2026-09-10T23:59:59.999Z', '2026-09-09'],
  ['2026-09-11T00:00:00.000Z', '2026-09-10'],
]) {
  test(`default daily report uses UTC yesterday at ${now}`, async t => {
    const app = await createApp(t, { now });
    const result = await request(app, '/api/analytics/daily-report', { token: 'local-test-token' });
    assert.equal(result.status, 200);
    assert.equal(result.body.daily_snapshot.date, yesterday);
    assert.equal(result.body.generated_at, now);
  });
}
