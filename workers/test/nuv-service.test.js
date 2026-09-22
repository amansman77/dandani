import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  awardNuvForReflection,
  createPostcardWithNuv,
  downloadPostcardImage,
  getSavedPostcards,
  getNuvWallet,
  savePostcard,
  uploadPostcardImage,
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
  database.exec(readFileSync(new URL('../schemas/schema_v260918_postcard_images.sql', import.meta.url), 'utf8'));

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

function imageRequest(userId, bytes) {
  return new Request('https://dandani.test/api/nuv/postcards/postcard-1/image', {
    method: 'POST',
    headers: { 'X-User-ID': userId, 'Content-Type': 'image/png' },
    body: bytes,
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

test('nine Nuv cannot issue a postcard and the tenth opens it', async () => {
  const { database, env } = createEnvironment();
  database.prepare('INSERT INTO daily_phrases VALUES (?, ?, ?, ?)')
    .run('phrase-1', 'user-1', '오늘을 믿자', 'active');
  const addNuv = database.prepare(`
    INSERT INTO nuv_transactions VALUES (?, ?, 1, 'daily_reflection', ?, datetime('now'))
  `);
  for (let day = 1; day <= 9; day += 1) addNuv.run(`reward-${day}`, 'user-1', `day-${day}`);

  const belowThreshold = await createPostcardWithNuv(env, request('user-1', {
    phrase_id: 'phrase-1',
  }));
  assert.deepEqual(belowThreshold, {
    created: false, postcard_id: null, balance: 9, threshold: 10,
  });

  addNuv.run('reward-10', 'user-1', 'day-10');
  const atThreshold = await createPostcardWithNuv(env, request('user-1', {
    phrase_id: 'phrase-1',
  }));
  assert.equal(atThreshold.created, true);
});

test('a user with no wallet row cannot issue a postcard', async () => {
  const { database, env } = createEnvironment();
  database.prepare('INSERT INTO daily_phrases VALUES (?, ?, ?, ?)')
    .run('phrase-1', 'user-1', '오늘을 믿자', 'active');

  // 되새김이 한 번도 없으면 지갑 행 자체가 없다. 문턱 검사의 하위 질의가
  // NULL을 돌려주는 경로라, 0누브와 같이 막히는지 따로 확인한다.
  const result = await createPostcardWithNuv(env, request('user-1', { phrase_id: 'phrase-1' }));
  assert.deepEqual(result, { created: false, postcard_id: null, balance: 0, threshold: 10 });
});

test('issuing a postcard leaves the Nuv untouched', async () => {
  const { database, env } = createEnvironment();
  database.prepare('INSERT INTO daily_phrases VALUES (?, ?, ?, ?)')
    .run('phrase-1', 'user-1', '오늘을 믿자', 'active');
  const addNuv = database.prepare(`
    INSERT INTO nuv_transactions VALUES (?, ?, 1, 'daily_reflection', ?, datetime('now'))
  `);
  for (let day = 1; day <= 10; day += 1) addNuv.run(`reward-${day}`, 'user-1', `day-${day}`);

  const created = await createPostcardWithNuv(env, request('user-1', {
    phrase_id: 'phrase-1', visit_days: 3,
  }));
  // 소모가 아니라 문턱이라, 두 번째 엽서도 같은 10누브로 계속 발행된다.
  const second = await createPostcardWithNuv(env, request('user-1', { phrase_id: 'phrase-1' }));
  const wallet = await getNuvWallet(env, request('user-1'));

  assert.equal(created.created, true);
  assert.equal(created.balance, 10);
  assert.ok(created.postcard_id);
  assert.equal(second.created, true);
  assert.deepEqual(wallet, { balance: 10, postcard_threshold: 10 });

  await savePostcard(env, created.postcard_id, request('user-1', { preset: 'dawn' }));
  const saved = await getSavedPostcards(env, request('user-1'));
  assert.equal(saved.postcards.length, 1);
  assert.equal(saved.postcards[0].phrase, '오늘을 믿자');
  assert.equal(saved.postcards[0].visit_days, 3);
  assert.equal(saved.postcards[0].preset, 'dawn');

  const imageBytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
  const uploaded = await uploadPostcardImage(
    env, created.postcard_id, imageRequest('user-1', imageBytes)
  );
  const token = uploaded.download_url.split('/').pop();
  const download = await downloadPostcardImage(env, token);

  assert.equal(download.status, 200);
  assert.equal(download.headers.get('Content-Type'), 'image/png');
  assert.equal(download.headers.get('Content-Disposition'), 'attachment; filename="dandani-postcard.png"');
  assert.deepEqual(new Uint8Array(await download.arrayBuffer()), imageBytes);
});
