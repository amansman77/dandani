import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { replacePhrase, rewritePhrase } from '../src/phrase-mutations.js';

// 고쳐 쓰기와 바꾸기의 차이는 "되새김 기록이 이어지는가" 하나다.
// 그 차이가 코드에서 사라지면 31일치가 말없이 0이 되므로 여기서 못 박는다.

class D1Statement {
  constructor(statement) {
    this.statement = statement;
    this.values = [];
  }

  bind(...values) { this.values = values; return this; }
  async first() { return this.statement.get(...this.values); }
  async run() {
    const result = this.statement.run(...this.values);
    return { meta: { changes: Number(result.changes) } };
  }
  async all() { return { results: this.statement.all(...this.values) }; }
  runBatch() { return this.run(); }
}

function createEnvironment() {
  const database = new DatabaseSync(':memory:');
  database.exec(`
    CREATE TABLE daily_phrases (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, phrase TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      retired_at TEXT, replacement_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE daily_phrase_logs (
      id TEXT PRIMARY KEY, phrase_id TEXT NOT NULL, user_id TEXT NOT NULL,
      log_date TEXT NOT NULL, UNIQUE(phrase_id, log_date)
    );
    CREATE TABLE user_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, event_type TEXT NOT NULL,
      event_data TEXT, session_id TEXT, user_agent TEXT, ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  database.prepare("INSERT INTO daily_phrases (id, user_id, phrase) VALUES (?, ?, ?)")
    .run('phrase-1', 'user-1', '화를 내기전에 한 번 더 묻자');
  const addLog = database.prepare('INSERT INTO daily_phrase_logs VALUES (?, ?, ?, ?)');
  for (let day = 1; day <= 31; day += 1) {
    addLog.run(`log-${day}`, 'phrase-1', 'user-1', `2026-08-${String(day).padStart(2, '0')}`);
  }

  const env = {
    DB: {
      prepare: (sql) => new D1Statement(database.prepare(sql)),
      batch: async (statements) => {
        database.exec('BEGIN');
        try {
          const out = [];
          for (const statement of statements) out.push(await statement.runBatch());
          database.exec('COMMIT');
          return out;
        } catch (error) {
          database.exec('ROLLBACK');
          throw error;
        }
      },
    },
  };
  return { database, env };
}

const request = (phrase) => new Request('https://dandani.test/api/phrases/phrase-1/rewrite', {
  method: 'POST',
  headers: { 'X-User-ID': 'user-1', 'Content-Type': 'application/json' },
  body: JSON.stringify({ phrase, source: 'written' }),
});

const logsFor = (database, phraseId) =>
  database.prepare('SELECT COUNT(*) AS n FROM daily_phrase_logs WHERE phrase_id = ?')
    .get(phraseId).n;

test('rewriting keeps the same phrase and its whole reflection record', async () => {
  const { database, env } = createEnvironment();

  const result = await rewritePhrase(env, 'phrase-1', request('화를 내기 전에 한 번 더 묻자'));

  // 같은 문장이라 id가 그대로다 — 기록이 id에 매여 있어서 이게 핵심이다.
  assert.equal(result.id, 'phrase-1');
  assert.equal(result.phrase, '화를 내기 전에 한 번 더 묻자');
  assert.equal(logsFor(database, 'phrase-1'), 31);

  const row = database.prepare('SELECT phrase, status FROM daily_phrases WHERE id = ?').get('phrase-1');
  assert.equal(row.phrase, '화를 내기 전에 한 번 더 묻자');
  assert.equal(row.status, 'active');
  // 접힌 문장이 생기지 않는다.
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM daily_phrases").get().n, 1);
});

test('replacing starts a new phrase whose record is empty', async () => {
  const { database, env } = createEnvironment();

  const result = await replacePhrase(env, 'phrase-1', request('먼저 인사하자'));

  assert.notEqual(result.id, 'phrase-1');
  // 옛 문장의 기록은 그대로 남고(기록 탭에서 본다), 새 문장은 0에서 시작한다.
  assert.equal(logsFor(database, 'phrase-1'), 31);
  assert.equal(logsFor(database, result.id), 0);
  assert.equal(
    database.prepare('SELECT status FROM daily_phrases WHERE id = ?').get('phrase-1').status,
    'retired'
  );
});

test('rewriting refuses to touch a retired phrase', async () => {
  const { database, env } = createEnvironment();
  database.exec("UPDATE daily_phrases SET status = 'retired' WHERE id = 'phrase-1'");

  await assert.rejects(
    () => rewritePhrase(env, 'phrase-1', request('다른 글자')),
    /사용 중인 문장을 찾을 수 없어요/
  );
});

test('rewriting refuses an empty phrase', async () => {
  const { env } = createEnvironment();
  await assert.rejects(() => rewritePhrase(env, 'phrase-1', request('   ')), /문장을 입력해 주세요/);
});
