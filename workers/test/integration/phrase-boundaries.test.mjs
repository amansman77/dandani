import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, request, seedPhrase } from './helpers.mjs';

const boundaries = [
  ['Korean midnight before', '2026-09-10T14:59:59.999Z', 'Asia/Seoul', '2026-09-10', 1],
  ['Korean midnight after', '2026-09-10T15:00:00.000Z', 'Asia/Seoul', '2026-09-11', 2],
  ['UTC midnight before', '2026-09-10T23:59:59.999Z', 'UTC', '2026-09-10', 1],
  ['UTC midnight after', '2026-09-11T00:00:00.000Z', 'UTC', '2026-09-11', 2],
];

for (const [label, now, timezone, today, days] of boundaries) {
  test(`${label}: visits and logs follow the requested calendar date`, async t => {
    const app = await createApp(t, { now });
    await seedPhrase(app.db);
    await app.db.prepare(`INSERT INTO user_events (user_id, event_type, created_at)
      VALUES ('test-user', 'page_visit', '2026-09-10 10:00:00')`).run();
    await app.db.prepare(`INSERT INTO daily_phrase_logs (id, phrase_id, user_id, log_date)
      VALUES ('previous', 'original', 'test-user', '2026-09-10')`).run();
    const active = await request(app, '/api/phrases/active', { timezone });
    assert.equal(active.status, 200);
    assert.equal(active.body.phrase.today, today);
    assert.equal(active.body.phrase.visit_days, days);
    assert.equal(active.body.phrase.logged_today, days === 1);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const logged = await request(app, '/api/phrases/original/log', { timezone, body: {} });
      assert.equal(logged.status, 200);
      assert.equal(logged.body.logged_days, days);
    }
    const { results } = await app.db.prepare('SELECT log_date FROM daily_phrase_logs ORDER BY log_date').all();
    assert.deepEqual(results.map(row => row.log_date), days === 1 ? ['2026-09-10'] : ['2026-09-10', today]);
    assert.deepEqual(app.outbound, []);
  });
}
