import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  awardNuvForReflection,
  createPostcardFromPhrase,
  longestStreak,
  currentStreak,
  issuePostcardForRecord,
  getSavedPostcards,
  getNuvLedger,
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
  database.exec(readFileSync(new URL('../schemas/schema_v260928_nuv_accounts.sql', import.meta.url), 'utf8'));
  database.exec(readFileSync(new URL('../schemas/schema_v260928_postcard_per_phrase_day.sql', import.meta.url), 'utf8'));
  database.exec(readFileSync(new URL('../schemas/schema_v260930_beat_three_days.sql', import.meta.url), 'utf8'));

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


// 서울 기준으로 그 날짜 정오. 누브의 하루는 서버 시계와 고정된 시간대로 센다.
function seoulNoon(date) {
  return { timezone: 'Asia/Seoul', now: new Date(`${date}T03:00:00Z`) };
}

test('a daily reflection awards one Nuv only once', async () => {
  const { database, env } = createEnvironment();
  database.prepare('INSERT INTO daily_phrase_logs VALUES (?, ?, ?, ?)')
    .run('log-1', 'phrase-1', 'user-1', '2026-09-17');

  const first = await awardNuvForReflection(env, 'user-1', 'phrase-1', '2026-09-17', seoulNoon('2026-09-17'));
  const duplicate = await awardNuvForReflection(env, 'user-1', 'phrase-1', '2026-09-17', seoulNoon('2026-09-17'));

  assert.deepEqual(first, { awarded_nuv: 1, balance: 1 });
  assert.deepEqual(duplicate, { awarded_nuv: 0, balance: 1 });
});

test('a replaced phrase does not earn a second Nuv on the same day', async () => {
  const { database, env } = createEnvironment();
  const addLog = database.prepare('INSERT INTO daily_phrase_logs VALUES (?, ?, ?, ?)');
  addLog.run('log-1', 'phrase-1', 'user-1', '2026-09-28');
  addLog.run('log-2', 'phrase-2', 'user-1', '2026-09-28');
  addLog.run('log-3', 'phrase-2', 'user-1', '2026-09-29');

  const first = await awardNuvForReflection(env, 'user-1', 'phrase-1', '2026-09-28', seoulNoon('2026-09-28'));
  const replaced = await awardNuvForReflection(env, 'user-1', 'phrase-2', '2026-09-28', seoulNoon('2026-09-28'));
  const nextDay = await awardNuvForReflection(env, 'user-1', 'phrase-2', '2026-09-29', seoulNoon('2026-09-29'));

  assert.deepEqual(first, { awarded_nuv: 1, balance: 1 });
  assert.deepEqual(replaced, { awarded_nuv: 0, balance: 1 });
  assert.deepEqual(nextDay, { awarded_nuv: 1, balance: 2 });
});

test('switching the timezone header does not earn a second Nuv on the same real day', async () => {
  const { database, env } = createEnvironment();
  const addLog = database.prepare('INSERT INTO daily_phrase_logs VALUES (?, ?, ?, ?)');
  // 서울 09-28 23:30 = UTC 14:30. 같은 순간 키리바시(UTC+14)는 이미 09-29다.
  const now = new Date('2026-09-28T14:30:00Z');
  addLog.run('log-1', 'phrase-1', 'user-1', '2026-09-28');
  addLog.run('log-2', 'phrase-1', 'user-1', '2026-09-29');

  const home = await awardNuvForReflection(env, 'user-1', 'phrase-1', '2026-09-28', { timezone: 'Asia/Seoul', now });
  const hopped = await awardNuvForReflection(env, 'user-1', 'phrase-1', '2026-09-29', { timezone: 'Pacific/Kiritimati', now });

  assert.deepEqual(home, { awarded_nuv: 1, balance: 1 });
  assert.deepEqual(hopped, { awarded_nuv: 0, balance: 1 });
  assert.equal(database.prepare('SELECT timezone FROM nuv_accounts').get().timezone, 'Asia/Seoul');
});

test('an unknown timezone is pinned as UTC and every account gets its own salt', async () => {
  const { database, env } = createEnvironment();
  const addLog = database.prepare('INSERT INTO daily_phrase_logs VALUES (?, ?, ?, ?)');
  addLog.run('log-1', 'phrase-1', 'user-1', '2026-09-28');
  addLog.run('log-2', 'phrase-2', 'user-2', '2026-09-28');
  const now = new Date('2026-09-28T12:00:00Z');

  await awardNuvForReflection(env, 'user-1', 'phrase-1', '2026-09-28', { timezone: 'Mars/Olympus', now });
  await awardNuvForReflection(env, 'user-2', 'phrase-2', '2026-09-28', { timezone: 'Asia/Seoul', now });

  const accounts = database.prepare('SELECT user_id, timezone, salt FROM nuv_accounts ORDER BY user_id').all();
  assert.equal(accounts[0].timezone, 'UTC');
  assert.match(accounts[0].salt, /^0x[0-9a-f]{64}$/);
  assert.notEqual(accounts[0].salt, accounts[1].salt);
});

test('the one-per-day migration keys existing rewards by date alone', async () => {
  const { database, env } = createEnvironment();
  database.prepare(`
    INSERT INTO nuv_transactions VALUES (?, ?, 1, 'daily_reflection', ?, datetime('now'))
  `).run('reward-1', 'user-1', 'phrase-1:2026-09-28');
  database.prepare('INSERT INTO daily_phrase_logs VALUES (?, ?, ?, ?)')
    .run('log-2', 'phrase-2', 'user-1', '2026-09-28');

  database.exec(readFileSync(
    new URL('../schemas/schema_v260928_nuv_one_per_day.sql', import.meta.url), 'utf8'
  ));

  // 옛 키로 받은 날에도 새 문장으로 한 번 더 받을 수 없다.
  const replaced = await awardNuvForReflection(env, 'user-1', 'phrase-2', '2026-09-28', seoulNoon('2026-09-28'));
  assert.deepEqual(replaced, { awarded_nuv: 0, balance: 1 });
  assert.equal(
    database.prepare('SELECT reference_id FROM nuv_transactions').get().reference_id,
    '2026-09-28'
  );
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

test('the ledger lists each Nuv day with the phrase reflected on, newest first', async () => {
  const { database, env } = createEnvironment();
  database.exec(`
    ALTER TABLE daily_phrase_logs ADD COLUMN created_at TEXT;
    ${readFileSync(new URL('../schemas/schema_v260928_nuv_anchors.sql', import.meta.url), 'utf8')}
  `);
  const addPhrase = database.prepare('INSERT INTO daily_phrases VALUES (?, ?, ?, ?)');
  const addLog = database.prepare(`
    INSERT INTO daily_phrase_logs (id, phrase_id, user_id, log_date, created_at) VALUES (?, ?, ?, ?, ?)
  `);
  const addNuv = database.prepare(`
    INSERT INTO nuv_transactions (id, user_id, amount, reason, reference_id, created_at)
    VALUES (?, ?, 1, 'daily_reflection', ?, ?)
  `);
  addPhrase.run('phrase-1', 'user-1', '오늘을 믿자', 'retired');
  addPhrase.run('phrase-2', 'user-1', '천천히 가도 된다', 'active');
  addLog.run('l1', 'phrase-1', 'user-1', '2026-09-26', '2026-09-26 00:00:00');
  addNuv.run('n1', 'user-1', '2026-09-26', '2026-09-26 00:00:00');
  // 같은 날 문장을 바꿔 다시 되새겨도 누브는 첫 되새김의 것 하나다.
  addLog.run('l2', 'phrase-2', 'user-1', '2026-09-26', '2026-09-26 05:00:00');
  addLog.run('l3', 'phrase-2', 'user-1', '2026-09-27', '2026-09-27 00:00:01');
  addNuv.run('n2', 'user-1', '2026-09-27', '2026-09-27 00:00:01');
  addNuv.run('other', 'user-2', '2026-09-27', '2026-09-27 00:00:01');
  database.prepare(`
    INSERT INTO nuv_anchors (day, cutoff_at, root, people, total_nuv, status)
    VALUES ('2026-09-26', '2026-09-26 15:30:00', '0xabc', 1, 1, 'awaiting_chain')
  `).run();

  const ledger = await getNuvLedger(env, request('user-1'));

  assert.equal(ledger.total, 2);
  assert.deepEqual(ledger.days.map(({ day, phrase }) => ({ day, phrase })), [
    { day: '2026-09-27', phrase: '천천히 가도 된다' },
    { day: '2026-09-26', phrase: '오늘을 믿자' },
  ]);
  assert.equal(ledger.last_sealed_day, '2026-09-26');
});

test('making a postcard turns the active phrase into a numbered postcard, with no writing', async () => {
  const { database, env } = createEnvironment();
  database.prepare('INSERT INTO daily_phrases VALUES (?, ?, ?, ?)').run('phrase-1', 'user-1', '천천히 가도 된다', 'active');
  const addLog = database.prepare('INSERT INTO daily_phrase_logs VALUES (?, ?, ?, ?)');
  addLog.run('l1', 'phrase-1', 'user-1', '2026-09-01');
  addLog.run('l2', 'phrase-1', 'user-1', '2026-09-02');

  const made = await createPostcardFromPhrase(env, request('user-1', { phrase_id: 'phrase-1' }));

  assert.equal(made.created, true);
  assert.equal(made.logged_days, 2);
  const row = database.prepare('SELECT * FROM digital_postcards WHERE id = ?').get(made.postcard_id);
  assert.equal(row.phrase, '천천히 가도 된다');
  assert.equal(row.issue_no, 1);
  assert.equal(row.status, 'saved');
  assert.equal(row.practice_body, null);
  assert.equal(row.practiced_on, made.issued_on);

  const { postcards } = await getSavedPostcards(env, request('user-1'));
  assert.equal(postcards[0].is_legacy, false);
  // 엽서도 밤마다 봉인되므로, 누브가 없던 사람도 엽서를 만들면 salt가 생긴다.
  assert.match(database.prepare('SELECT salt FROM nuv_accounts WHERE user_id = ?').get('user-1').salt, /^0x[0-9a-f]{64}$/);
});

test('pressing again on the same day hands back the same postcard', async () => {
  const { database, env } = createEnvironment();
  database.prepare('INSERT INTO daily_phrases VALUES (?, ?, ?, ?)').run('phrase-1', 'user-1', '오늘을 믿자', 'active');

  const first = await createPostcardFromPhrase(env, request('user-1', { phrase_id: 'phrase-1' }));
  const again = await createPostcardFromPhrase(env, request('user-1', { phrase_id: 'phrase-1' }));

  assert.equal(again.created, false);
  assert.equal(again.postcard_id, first.postcard_id);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM digital_postcards').get().n, 1);
});

test('only your own active phrase can become a postcard', async () => {
  const { database, env } = createEnvironment();
  const addPhrase = database.prepare('INSERT INTO daily_phrases VALUES (?, ?, ?, ?)');
  addPhrase.run('retired', 'user-1', '옛 문장', 'retired');
  addPhrase.run('theirs', 'user-2', '남의 문장', 'active');

  await assert.rejects(createPostcardFromPhrase(env, request('user-1', { phrase_id: 'retired' })), /찾을 수 없어요/);
  await assert.rejects(createPostcardFromPhrase(env, request('user-1', { phrase_id: 'theirs' })), /찾을 수 없어요/);
  await assert.rejects(createPostcardFromPhrase(env, request('user-1', {})), /어떤 문장/);
});

test('the longest streak counts calendar days in a row, ignoring repeats and gaps', () => {
  assert.equal(longestStreak([]), 0);
  assert.equal(longestStreak(['2026-09-01']), 1);
  assert.equal(longestStreak(['2026-09-01', '2026-09-02', '2026-09-04']), 2);
  assert.equal(longestStreak(['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-02']), 3);
  // 서머타임이 바뀌는 날을 끼어도 하루는 하루다.
  assert.equal(longestStreak(['2026-03-07', '2026-03-08', '2026-03-09']), 3);
});

function seedPhraseWithLogs(database, dates) {
  database.prepare('INSERT INTO daily_phrases VALUES (?, ?, ?, ?)').run('phrase-1', 'user-1', '천천히 가도 된다', 'active');
  const addLog = database.prepare('INSERT INTO daily_phrase_logs VALUES (?, ?, ?, ?)');
  dates.forEach((date, index) => addLog.run(`l${index}`, 'phrase-1', 'user-1', date));
}

const special = { phrase_id: 'phrase-1', kind: 'beat_three_days' };

test('the beat-three-days postcard needs three days in a row, not three days in total', async () => {
  const { database, env } = createEnvironment();
  seedPhraseWithLogs(database, ['2026-09-01', '2026-09-02', '2026-09-04']);

  await assert.rejects(createPostcardFromPhrase(env, request('user-1', special)), /3일 연속/);
  assert.equal(database.prepare('SELECT COUNT(*) AS n FROM digital_postcards').get().n, 0);
});

test('three days in a row earns one special postcard per phrase, even after a later gap', async () => {
  const { database, env } = createEnvironment();
  seedPhraseWithLogs(database, ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10']);

  const made = await createPostcardFromPhrase(env, request('user-1', special));
  const again = await createPostcardFromPhrase(env, request('user-1', special));
  // 같은 날 일반 엽서도 따로 만들 수 있다 — 두 규칙이 서로 막지 않는다.
  const regular = await createPostcardFromPhrase(env, request('user-1', { phrase_id: 'phrase-1' }));

  assert.equal(made.kind, 'beat_three_days');
  assert.equal(made.created, true);
  assert.equal(made.logged_days, 4);
  assert.equal(again.created, false);
  assert.equal(again.postcard_id, made.postcard_id);
  assert.equal(regular.kind, 'regular');
  assert.notEqual(regular.postcard_id, made.postcard_id);

  const { postcards } = await getSavedPostcards(env, request('user-1'));
  assert.deepEqual(postcards.map(p => p.kind).sort(), ['beat_three_days', 'regular']);
});

test('an unknown postcard kind is refused', async () => {
  const { database, env } = createEnvironment();
  seedPhraseWithLogs(database, []);
  await assert.rejects(createPostcardFromPhrase(env, request('user-1', { phrase_id: 'phrase-1', kind: 'gold' })), /알 수 없는 엽서/);
});

test('the current streak ends today, or yesterday if today is not reflected yet', () => {
  const dates = ['2026-09-27', '2026-09-28', '2026-09-29'];
  assert.equal(currentStreak(dates, '2026-09-29'), 3);
  assert.equal(currentStreak(dates, '2026-09-30'), 3);
  assert.equal(currentStreak(dates, '2026-10-01'), 0);
  assert.equal(currentStreak([], '2026-10-01'), 0);
});
