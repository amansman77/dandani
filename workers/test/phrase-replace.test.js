import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { replacePhrase } from '../src/phrase-mutations.js';

// 문장을 바꾸면 되새김은 처음부터 다시 센다. 다른 말을 살기로 한 것이니
// 그 문장의 날수도 거기서 시작한다.
//
// 한때 글자만 고치는 길(rewrite)을 따로 뒀다가 걷어냈다. 잃는 것이 생각보다
// 작았기 때문이다 — 누브는 사람에 붙어 있어 안 줄고, 엽서와 실천 기록은
// 그때 문장을 복사해 굳혀둬서 안 사라진다. 바뀌는 건 그 문장의 날수뿐이고,
// 문장이 바뀌었으면 그게 0인 게 맞다.
//
// 그러니 여기서 못 박는 건 하나다: 옛 문장의 기록은 남고(기록 탭에서 본다),
// 새 문장은 0에서 시작한다.

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
