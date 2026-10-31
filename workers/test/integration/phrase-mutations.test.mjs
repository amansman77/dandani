import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, request, seedPhrase, applySchema } from './helpers.mjs';

test('replacement preserves logs and returns the same result on retry', async t => {
  const app = await createApp(t);
  await seedPhrase(app.db);
  await app.db.prepare(`INSERT INTO daily_phrase_logs (id, phrase_id, user_id, log_date)
    VALUES ('log', 'original', 'test-user', '2026-09-09')`).run();
  const replace = () => request(app, '/api/phrases/original/replace', { body: { phrase: '새 문장' } });
  const result = await replace();
  assert.equal(result.status, 200);
  assert.equal(result.body.phrase, '새 문장');
  assert.deepEqual(await replace(), result);
  const history = await request(app, '/api/phrases/history');
  assert.equal(history.body.phrases.length, 2);
  const original = history.body.phrases.find(p => p.id === 'original');
  assert.equal(original.status, 'retired');
  assert.equal(original.logged_days, 1);
});

test('failed replacement insert rolls back the original retirement', async t => {
  const app = await createApp(t);
  await seedPhrase(app.db);
  await app.db.prepare(`CREATE TRIGGER fail_phrase_insert BEFORE INSERT ON daily_phrases
    BEGIN SELECT RAISE(ABORT, 'simulated storage failure'); END`).run();
  const result = await request(app, '/api/phrases/original/replace', { body: { phrase: '새 문장' } });
  assert.equal(result.status, 500);
  const original = await app.db.prepare('SELECT * FROM daily_phrases WHERE id = ?').bind('original').first();
  assert.equal(original.status, 'active');
  assert.equal(original.retired_at, null);
  assert.equal(original.replacement_id, null);
  assert.doesNotMatch(JSON.stringify(result.body), /storage failure|INSERT|D1/);
});

test('parallel creates leave exactly one active phrase and return a conflict', async t => {
  const app = await createApp(t);
  const responses = await Promise.all(['첫 문장', '다른 문장'].map(phrase =>
    request(app, '/api/phrases', { body: { phrase } })));
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  const row = await app.db.prepare("SELECT COUNT(*) AS n FROM daily_phrases WHERE status = 'active'").first();
  assert.equal(row.n, 1);
});

test('concurrent identical replacements are idempotent', async t => {
  const app = await createApp(t);
  await seedPhrase(app.db);
  const responses = await Promise.all(Array.from({ length: 2 }, () =>
    request(app, '/api/phrases/original/replace', { body: { phrase: '같은 문장' } })));
  assert.equal(responses[0].status, 200);
  assert.deepEqual(responses[0], responses[1]);
});

test('competing replacements cannot overwrite each other', async t => {
  const app = await createApp(t);
  await seedPhrase(app.db);
  const responses = await Promise.all(['문장 A', '문장 B'].map(phrase =>
    request(app, '/api/phrases/original/replace', { body: { phrase } })));
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
});

test('invalid and foreign replacements preserve the active phrase', async t => {
  const app = await createApp(t);
  await seedPhrase(app.db);
  for (const phrase of [' ', 123, null]) {
    const result = await request(app, '/api/phrases/original/replace', { body: { phrase } });
    assert.equal(result.status, 400);
  }
  const foreign = await request(app, '/api/phrases/original/replace', { user: 'other-user', body: { phrase: '침범' } });
  assert.equal(foreign.status, 404);
  const active = await app.db.prepare("SELECT COUNT(*) AS n FROM daily_phrases WHERE status = 'active'").first();
  assert.equal(active.n, 1);
});

test('unique migration rejects existing duplicates without deleting either row', async t => {
  const app = await createApp(t, { migrate: false });
  await seedPhrase(app.db);
  await seedPhrase(app.db, { id: 'duplicate' });
  await assert.rejects(applySchema(app.db, 'schema_v260910_active_phrase_unique.sql'), /UNIQUE/);
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS n FROM daily_phrases').first()).n, 2);
});

test('the unique index also blocks writers that bypass the service check', async t => {
  const app = await createApp(t);
  await seedPhrase(app.db);
  await assert.rejects(seedPhrase(app.db, { id: 'duplicate' }), /UNIQUE/);
});

test('replacement retries do not duplicate creation or retirement events', async t => {
  const app = await createApp(t);
  await seedPhrase(app.db);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await request(app, '/api/phrases/original/replace', { body: { phrase: '새 문장' } });
  }
  const { results } = await app.db.prepare('SELECT event_type, COUNT(*) AS n FROM user_events GROUP BY event_type').all();
  assert.deepEqual(results.map(row => [row.event_type, row.n]).sort(), [['phrase_retired', 1], ['phrase_start', 1]]);
});

test('an old replacement retry cannot revive a newer retired phrase', async t => {
  const app = await createApp(t);
  await seedPhrase(app.db);
  const first = await request(app, '/api/phrases/original/replace', { body: { phrase: '두 번째' } });
  await request(app, `/api/phrases/${first.body.id}/replace`, { body: { phrase: '세 번째' } });
  const retry = await request(app, '/api/phrases/original/replace', { body: { phrase: '두 번째' } });
  assert.equal(retry.status, 409);
  assert.equal((await request(app, '/api/phrases/active')).body.phrase.phrase, '세 번째');
});

test('analytics storage failure does not undo a committed phrase replacement', async t => {
  const app = await createApp(t);
  await seedPhrase(app.db);
  await app.db.prepare(`CREATE TRIGGER fail_events BEFORE INSERT ON user_events
    BEGIN SELECT RAISE(ABORT, 'simulated analytics failure'); END`).run();
  const result = await request(app, '/api/phrases/original/replace', { body: { phrase: '새 문장' } });
  assert.equal(result.status, 200);
  assert.equal((await request(app, '/api/phrases/active')).body.phrase.phrase, '새 문장');
});
