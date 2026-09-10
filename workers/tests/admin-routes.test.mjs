import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, request } from './helpers.mjs';

const routes = [
  '/api/analytics/retention', '/api/analytics/activity', '/api/analytics/daily-report',
  '/api/discord/daily-report', '/api/discord/daily-insight', '/api/insight/debug?category=data',
];

test('missing or incorrect credentials block all operational endpoints before side effects', async t => {
  const app = await createApp(t);
  for (const path of routes) {
    for (const token of [undefined, 'incorrect-token']) {
      const result = await request(app, path, { token });
      assert.equal(result.status, 401, path);
    }
  }
  assert.deepEqual(app.outbound, []);
});

test('missing admin secret fails closed but public phrase API still works', async t => {
  const app = await createApp(t, { token: '' });
  const admin = await request(app, '/api/analytics/retention', { token: 'anything' });
  assert.equal(admin.status, 503);
  assert.equal((await request(app, '/api/phrases/active')).status, 200);
  assert.deepEqual(app.outbound, []);
});

test('correct credentials allow local reports and UX debug without external requests', async t => {
  const app = await createApp(t);
  const report = await request(app, '/api/analytics/daily-report', { token: 'local-test-token' });
  assert.equal(report.status, 200);
  assert.equal(report.body.funnel_30d.visitors, 0);
  const ux = await request(app, '/api/insight/debug?category=ux', { token: 'local-test-token' });
  assert.equal(ux.status, 200);
  assert.equal(ux.body, null);
  assert.deepEqual(app.outbound, []);
});

test('invalid operational parameters are rejected before any external request', async t => {
  const app = await createApp(t);
  for (const path of [
    '/api/analytics/activity?days=-1', '/api/analytics/activity?days=30oops',
    '/api/analytics/daily-report?date=2026-02-30', '/api/insight/debug?category=unknown',
  ]) {
    assert.equal((await request(app, path, { token: 'local-test-token' })).status, 400, path);
  }
  assert.deepEqual(app.outbound, []);
});

test('bad JSON is a client error and public event collection remains available', async t => {
  const app = await createApp(t);
  const malformed = await app.mf.dispatchFetch('http://localhost/api/analytics/event', {
    method: 'POST', body: '{', headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(malformed.status, 400);
  const event = await request(app, '/api/analytics/event', { body: { event_type: 'page_visit', event_data: {} } });
  assert.equal(event.status, 200);
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS n FROM user_events').first()).n, 1);
});
