import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  createPracticeRecord, getPracticeRecords, issueAwaitingPostcards,
} from '../src/practice-service.js';

class D1Statement {
  constructor(statement) {
    this.statement = statement;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    return this.statement.get(...this.values);
  }

  async run() {
    const result = this.statement.run(...this.values);
    return { meta: { changes: Number(result.changes) } };
  }

  async all() {
    return { results: this.statement.all(...this.values) };
  }
}

function createEnvironment() {
  const database = new DatabaseSync(':memory:');
  database.exec(`
    CREATE TABLE daily_phrases (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, phrase TEXT NOT NULL, status TEXT NOT NULL
    );
  `);
  for (const file of [
    '../schemas/schema_v260917_nuv.sql',
    '../schemas/schema_v260917_postcards.sql',
    '../schemas/schema_v260918_postcard_images.sql',
    '../schemas/schema_v260923_practice_records.sql',
  ]) {
    database.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
  }
  database.prepare('INSERT INTO daily_phrases VALUES (?, ?, ?, ?)')
    .run('phrase-1', 'user-1', '화를 내기 전에 한 번 더 묻자', 'active');

  return { database, env: { DB: { prepare: (sql) => new D1Statement(database.prepare(sql)) } } };
}

function addNuv(database, userId, days) {
  const insert = database.prepare(`
    INSERT INTO nuv_transactions VALUES (?, ?, 1, 'daily_reflection', ?, datetime('now'))
  `);
  for (let day = 1; day <= days; day += 1) insert.run(`r-${userId}-${day}`, userId, `day-${day}`);
}

function request(body, { search = '', timezone = 'Asia/Seoul' } = {}) {
  return new Request(`https://dandani.test/api/practices${search}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-User-ID': 'user-1', 'Content-Type': 'application/json', 'X-Client-Timezone': timezone,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test('a record below the threshold is still kept, and waits for a postcard', async () => {
  const { database, env } = createEnvironment();
  addNuv(database, 'user-1', 3);

  const result = await createPracticeRecord(env, request({
    phrase_id: 'phrase-1', body: '바로 받아치지 않고 무슨 뜻이냐고 먼저 물었다.',
  }));

  // 문턱을 못 넘어도 사라지면 안 된다 — 딱 한 번뿐인 사건이라 다시 오지 않는다.
  assert.equal(result.issued, false);
  assert.equal(result.postcard_id, null);
  assert.equal(result.nuv_needed, 7);
  assert.equal(result.record.nuv_at_record, 3);

  const listed = await getPracticeRecords(env, request());
  assert.equal(listed.records.length, 1);
  assert.equal(listed.records[0].awaiting_issue, true);
});

test('crossing the threshold issues every waiting record exactly once', async () => {
  const { database, env } = createEnvironment();
  addNuv(database, 'user-1', 3);
  await createPracticeRecord(env, request({ phrase_id: 'phrase-1', body: '첫 번째' }));
  await createPracticeRecord(env, request({ phrase_id: 'phrase-1', body: '두 번째' }));

  assert.deepEqual(await issueAwaitingPostcards(env, 'user-1'), { issued: 0 });

  database.exec("DELETE FROM nuv_transactions WHERE user_id = 'user-1'");
  database.exec("UPDATE nuv_wallets SET balance = 0 WHERE user_id = 'user-1'");
  addNuv(database, 'user-1', 10);

  assert.deepEqual(await issueAwaitingPostcards(env, 'user-1'), { issued: 2 });
  // 두 번 불러도 두 장이 더 생기면 안 된다.
  assert.deepEqual(await issueAwaitingPostcards(env, 'user-1'), { issued: 0 });

  const listed = await getPracticeRecords(env, request());
  assert.deepEqual(listed.records.map((record) => record.awaiting_issue), [false, false]);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM digital_postcards').get().n, 2);
});

test('a record above the threshold issues its postcard immediately', async () => {
  const { database, env } = createEnvironment();
  addNuv(database, 'user-1', 12);

  const result = await createPracticeRecord(env, request({
    phrase_id: 'phrase-1', body: '오늘 그렇게 했다',
  }));

  assert.equal(result.issued, true);
  assert.ok(result.postcard_id);
  assert.equal(result.nuv_needed, 0);
  const postcard = database.prepare('SELECT * FROM digital_postcards').get();
  assert.equal(postcard.practice_record_id, result.record.id);
  assert.equal(postcard.phrase, '화를 내기 전에 한 번 더 묻자');
});

test('the phrase is frozen into the record, so replacing it later changes nothing', async () => {
  const { database, env } = createEnvironment();
  addNuv(database, 'user-1', 12);
  const result = await createPracticeRecord(env, request({
    phrase_id: 'phrase-1', body: '그때 그렇게 했다',
  }));

  database.exec("UPDATE daily_phrases SET phrase = '완전히 다른 문장' WHERE id = 'phrase-1'");

  const listed = await getPracticeRecords(env, request());
  assert.equal(listed.records[0].phrase, '화를 내기 전에 한 번 더 묻자');
  assert.equal(result.record.phrase, '화를 내기 전에 한 번 더 묻자');
});

test('a past date is accepted and a future date falls back to today', async () => {
  const { database, env } = createEnvironment();
  addNuv(database, 'user-1', 1);

  const past = await createPracticeRecord(env, request({
    phrase_id: 'phrase-1', body: '그저께 있었던 일', practiced_on: '2026-09-01',
  }));
  const future = await createPracticeRecord(env, request({
    phrase_id: 'phrase-1', body: '아직 살지 않은 날', practiced_on: '2099-01-01',
  }));

  assert.equal(past.record.practiced_on, '2026-09-01');
  assert.notEqual(future.record.practiced_on, '2099-01-01');
  assert.match(future.record.practiced_on, /^\d{4}-\d{2}-\d{2}$/);
});

test('an empty record is refused', async () => {
  const { env } = createEnvironment();
  await assert.rejects(
    () => createPracticeRecord(env, request({ phrase_id: 'phrase-1', body: '   ' })),
    /한 줄이라도/
  );
});

test('records can be filtered to one phrase', async () => {
  const { database, env } = createEnvironment();
  database.prepare('INSERT INTO daily_phrases VALUES (?, ?, ?, ?)')
    .run('phrase-2', 'user-1', '다른 문장', 'retired');
  addNuv(database, 'user-1', 2);
  await createPracticeRecord(env, request({ phrase_id: 'phrase-1', body: '첫 문장 실천' }));
  await createPracticeRecord(env, request({ phrase_id: 'phrase-2', body: '둘째 문장 실천' }));

  const filtered = await getPracticeRecords(env, request(null, { search: '?phrase_id=phrase-2' }));
  assert.equal(filtered.records.length, 1);
  assert.equal(filtered.records[0].body, '둘째 문장 실천');
});
