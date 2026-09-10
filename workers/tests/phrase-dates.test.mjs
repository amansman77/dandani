import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, request, seedPhrase } from './helpers.mjs';

test('UTC visits and local logs on the same Korean date count once', async t => {
  const app = await createApp(t);
  await seedPhrase(app.db);
  for (const at of ['2026-09-09 15:30:00', '2026-09-09 22:00:00']) {
    await app.db.prepare(`INSERT INTO user_events (user_id, event_type, created_at)
      VALUES ('test-user', 'page_visit', ?)`).bind(at).run();
  }
  await app.db.prepare(`INSERT INTO daily_phrase_logs (id, phrase_id, user_id, log_date)
    VALUES ('log', 'original', 'test-user', '2026-09-10')`).run();
  const active = await request(app, '/api/phrases/active');
  assert.equal(active.body.phrase.visit_days, 2);
  assert.equal(active.body.phrase.today, '2026-09-11');
});

test('server clock determines today even when client sends an old timestamp', async t => {
  const app = await createApp(t);
  await seedPhrase(app.db);
  const response = await app.mf.dispatchFetch('http://localhost/api/phrases/original/log', {
    method: 'POST', headers: {
      'X-User-ID': 'test-user', 'X-Client-Timezone': 'Asia/Seoul', 'X-Client-Time': '2000-01-01T00:00:00Z',
    },
  });
  assert.equal(response.status, 200);
  const row = await app.db.prepare('SELECT log_date FROM daily_phrase_logs').first();
  assert.equal(row.log_date, '2026-09-11');
});

test('invalid timezone falls back to UTC and duplicate logs remain idempotent', async t => {
  const app = await createApp(t);
  await seedPhrase(app.db);
  for (let i = 0; i < 2; i += 1) {
    const result = await request(app, '/api/phrases/original/log', { timezone: 'Invalid/Timezone', body: {} });
    assert.equal(result.status, 200);
    assert.equal(result.body.logged_days, 1);
  }
  const active = await request(app, '/api/phrases/active', { timezone: 'Invalid/Timezone' });
  assert.equal(active.body.phrase.logged_today, true);
  assert.equal(active.body.phrase.today, '2026-09-10');
});

test('logging after replacement cannot add a record to a retired phrase', async t => {
  const app = await createApp(t);
  await seedPhrase(app.db);
  await request(app, '/api/phrases/original/replace', { body: { phrase: '다음 문장' } });
  const result = await request(app, '/api/phrases/original/log', { body: {} });
  assert.equal(result.status, 409);
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS n FROM daily_phrase_logs').first()).n, 0);
});

test('simultaneous log and replace either persist the log or report a conflict', async t => {
  const app = await createApp(t);
  await seedPhrase(app.db);
  const [logged] = await Promise.all([
    request(app, '/api/phrases/original/log', { body: {} }),
    request(app, '/api/phrases/original/replace', { body: { phrase: '다음 문장' } }),
  ]);
  const row = await app.db.prepare('SELECT COUNT(*) AS n FROM daily_phrase_logs').first();
  assert.ok([200, 409].includes(logged.status));
  if (logged.status === 200) assert.equal(row.n, 1, 'successful log responses must represent a saved record');
});
