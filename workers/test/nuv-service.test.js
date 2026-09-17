import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  awardNuvForReflection,
  claimWelcomeNuv,
  createPostcardWithNuv,
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

test('the welcome grant awards ten Nuv only once', async () => {
  const { env } = createEnvironment();

  const first = await claimWelcomeNuv(env, request('user-1', {}));
  const duplicate = await claimWelcomeNuv(env, request('user-1', {}));

  assert.deepEqual(first, { awarded_nuv: 10, balance: 10, postcard_cost: 10 });
  assert.deepEqual(duplicate, { awarded_nuv: 0, balance: 10, postcard_cost: 10 });
});

test('the deployed-schema migration preserves transactions and enables welcome grants', async () => {
  const database = new DatabaseSync(':memory:');
  database.exec(`
    CREATE TABLE nuv_wallets (
      user_id TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE nuv_transactions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      amount INTEGER NOT NULL CHECK (amount != 0),
      reason TEXT NOT NULL CHECK (reason IN ('daily_reflection', 'postcard_creation')),
      reference_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, reason, reference_id)
    );
    CREATE INDEX idx_nuv_transactions_user_created
      ON nuv_transactions(user_id, created_at DESC);
    INSERT INTO nuv_wallets (user_id, balance) VALUES ('user-1', 1);
    INSERT INTO nuv_transactions (id, user_id, amount, reason, reference_id)
      VALUES ('reward-1', 'user-1', 1, 'daily_reflection', 'day-1');
  `);
  database.exec(readFileSync(
    new URL('../schemas/schema_v260917_nuv_welcome_grant.sql', import.meta.url), 'utf8'
  ));
  const env = { DB: { prepare: (sql) => new D1Statement(database.prepare(sql)) } };

  const granted = await claimWelcomeNuv(env, request('user-1', {}));
  const preserved = database.prepare('SELECT COUNT(*) AS count FROM nuv_transactions').get();

  assert.deepEqual(granted, { awarded_nuv: 10, balance: 11, postcard_cost: 10 });
  assert.equal(preserved.count, 2);
});

test('a postcard costs ten Nuv and insufficient balance is not changed', async () => {
  const { database, env } = createEnvironment();
  database.prepare('INSERT INTO daily_phrases VALUES (?, ?, ?, ?)')
    .run('phrase-1', 'user-1', '오늘을 믿자', 'active');
  const addNuv = database.prepare(`
    INSERT INTO nuv_transactions VALUES (?, ?, 1, 'daily_reflection', ?, datetime('now'))
  `);
  for (let day = 1; day <= 10; day += 1) {
    addNuv.run(`reward-${day}`, 'user-1', `day-${day}`);
  }

  const created = await createPostcardWithNuv(env, request('user-1', {
    phrase_id: 'phrase-1', visit_days: 3,
  }));
  const rejected = await createPostcardWithNuv(env, request('user-1', { phrase_id: 'phrase-1' }));
  const wallet = await getNuvWallet(env, request('user-1'));

  assert.equal(created.created, true);
  assert.equal(created.balance, 0);
  assert.ok(created.postcard_id);
  assert.deepEqual(rejected, { created: false, postcard_id: null, balance: 0, cost: 10 });
  assert.deepEqual(wallet, { balance: 0, postcard_cost: 10 });

  await savePostcard(env, created.postcard_id, request('user-1', { preset: 'dawn' }));
  const saved = await getSavedPostcards(env, request('user-1'));
  assert.equal(saved.postcards.length, 1);
  assert.equal(saved.postcards[0].phrase, '오늘을 믿자');
  assert.equal(saved.postcards[0].visit_days, 3);
  assert.equal(saved.postcards[0].preset, 'dawn');
});
