import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  awardNuvForReflection,
  issuePostcardForRecord,
  getSavedPostcards,
  getNuvWallet,
  savePostcard,
} from '../src/nuv-service.js';

class D1Statement {
  constructor(statement) {
    this.statement = statement;
    this.values = [];
  }

  bind(...values) {
    this.values = values.map((value) => (
      value instanceof ArrayBuffer ? new Uint8Array(value) : value
    ));
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

  executeBatch() {
    return { results: this.statement.all(...this.values) };
  }
}

class D1Database {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new D1Statement(this.database.prepare(sql));
  }

  async batch(statements) {
    this.database.exec('BEGIN');
    try {
      const results = statements.map((statement) => statement.executeBatch());
      this.database.exec('COMMIT');
      return results;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }
}

function createEnvironment() {
  const database = new DatabaseSync(':memory:');
  database.exec(`
    CREATE TABLE daily_phrases (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, phrase TEXT NOT NULL, status TEXT NOT NULL
    );
    CREATE TABLE daily_phrase_logs (
      id TEXT PRIMARY KEY, phrase_id TEXT NOT NULL, user_id TEXT NOT NULL,
      log_date TEXT NOT NULL, UNIQUE(phrase_id, log_date)
    );
  `);
  database.exec(readFileSync(new URL('../schemas/schema_v260917_nuv.sql', import.meta.url), 'utf8'));
  database.exec(readFileSync(new URL('../schemas/schema_v260917_postcards.sql', import.meta.url), 'utf8'));
  database.exec(readFileSync(new URL('../schemas/schema_v260923_practice_records.sql', import.meta.url), 'utf8'));
  database.exec(readFileSync(new URL('../schemas/schema_v260918_postcard_images.sql', import.meta.url), 'utf8'));
  database.exec(readFileSync(new URL('../schemas/schema_v260923_postcard_proof.sql', import.meta.url), 'utf8'));
  // 이미지 칸은 만들었다가 걷어냈다 — 실제 순서대로 재현해야 DROP도 검증된다.
  database.exec(readFileSync(new URL('../schemas/schema_v260924_drop_postcard_images.sql', import.meta.url), 'utf8'));
  database.exec(readFileSync(new URL('../schemas/schema_v260926_practice_logged_days.sql', import.meta.url), 'utf8'));

  return {
    database,
    env: { DB: new D1Database(database) },
  };
}

function request(userId, body) {
  return new Request('https://dandani.test/api', {
    method: body ? 'POST' : 'GET',
    headers: { 'X-User-ID': userId, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}


test('a daily reflection awards one Nuv only once', async () => {
  const { database, env } = createEnvironment();
  database.prepare('INSERT INTO daily_phrase_logs VALUES (?, ?, ?, ?)')
    .run('log-1', 'phrase-1', 'user-1', '2026-09-17');

  const first = await awardNuvForReflection(env, 'user-1', 'phrase-1', '2026-09-17');
  const duplicate = await awardNuvForReflection(env, 'user-1', 'phrase-1', '2026-09-17');

  assert.deepEqual(first, { awarded_nuv: 1, balance: 1 });
  assert.deepEqual(duplicate, { awarded_nuv: 0, balance: 1 });
});

test('the accrual migration erases granted and spent Nuv and rebuilds balances', async () => {
  const { database } = createEnvironment();
  const addTransaction = database.prepare(`
    INSERT INTO nuv_transactions VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);
  // 선물만 받고 되새김은 없는 사람, 그리고 되새긴 뒤 엽서까지 만든 사람.
  // 프로덕션 원장이 정확히 이 두 모양이었다.
  addTransaction.run('grant-1', 'user-1', 10, 'welcome_grant', 'welcome');
  addTransaction.run('grant-2', 'user-2', 10, 'welcome_grant', 'welcome');
  addTransaction.run('reward-1', 'user-2', 1, 'daily_reflection', 'day-1');
  addTransaction.run('reward-2', 'user-2', 1, 'daily_reflection', 'day-2');
  addTransaction.run('spend-1', 'user-2', -10, 'postcard_creation', 'postcard-1');

  assert.equal(database.prepare('SELECT balance FROM nuv_wallets WHERE user_id = ?').get('user-1').balance, 10);
  assert.equal(database.prepare('SELECT balance FROM nuv_wallets WHERE user_id = ?').get('user-2').balance, 2);

  database.exec(readFileSync(
    new URL('../schemas/schema_v260922_nuv_accrual.sql', import.meta.url), 'utf8'
  ));

  // 선물만 받은 사람은 0으로, 되새긴 사람은 되새긴 날의 수 그대로 남는다.
  assert.equal(database.prepare('SELECT balance FROM nuv_wallets WHERE user_id = ?').get('user-1').balance, 0);
  assert.equal(database.prepare('SELECT balance FROM nuv_wallets WHERE user_id = ?').get('user-2').balance, 2);
  const remaining = database.prepare('SELECT reason, COUNT(*) AS count FROM nuv_transactions GROUP BY reason').all();
  assert.deepEqual(
    remaining.map(({ reason, count }) => ({ reason, count })),
    [{ reason: 'daily_reflection', count: 2 }]
  );
});

test('issuing a postcard leaves the Nuv untouched', async () => {
  const { database, env } = createEnvironment();
  const addNuv = database.prepare(`
    INSERT INTO nuv_transactions VALUES (?, ?, 1, 'daily_reflection', ?, datetime('now'))
  `);
  for (let day = 1; day <= 10; day += 1) addNuv.run(`reward-${day}`, 'user-1', `day-${day}`);

  // 엽서가 나오는 길은 이제 실천 기록 하나뿐이다.
  const record = {
    id: 'practice-1', phrase_id: 'phrase-1', phrase: '오늘을 믿자',
    body: '오늘 그렇게 했다', practiced_on: '2026-09-23', nuv_at_record: 3,
  };
  const postcardId = await issuePostcardForRecord(env, 'user-1', record);
  // 소모가 아니라서 발행해도 10누브 그대로다.
  const wallet = await getNuvWallet(env, request('user-1'));

  assert.ok(postcardId);
  assert.deepEqual(wallet, { balance: 10 });

  await savePostcard(env, postcardId, request('user-1', { preset: 'dawn' }));
  const saved = await getSavedPostcards(env, request('user-1'));
  assert.equal(saved.postcards.length, 1);
  assert.equal(saved.postcards[0].phrase, '오늘을 믿자');
  assert.equal(saved.postcards[0].preset, 'dawn');
  assert.equal(saved.postcards[0].issue_no, 1);

});
