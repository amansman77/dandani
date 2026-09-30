import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import {
  commitmentOf,
  POSTCARD_LEAF_ENCODING,
  postcardContentHash,
  postcardProof,
  proofForUser,
  stampLedger,
} from '../src/nuv-anchor-service.js';

// 도장에 필요한 만큼만 흉내 내는 D1.
function d1(database) {
  return {
    prepare(sql) {
      const statement = database.prepare(sql);
      let values = [];
      return {
        bind(...bound) { values = bound; return this; },
        async first() { return statement.get(...values); },
        async all() { return { results: statement.all(...values) }; },
        async run() { return { meta: { changes: Number(statement.run(...values).changes) } }; },
      };
    },
  };
}

function createEnvironment() {
  const database = new DatabaseSync(':memory:');
  for (const file of [
    'schema_v260917_nuv.sql',
    'schema_v260928_nuv_accounts.sql',
    'schema_v260928_nuv_anchors.sql',
    'schema_v260917_postcards.sql',
    'schema_v260918_postcard_images.sql',
    'schema_v260923_practice_records.sql',
    'schema_v260923_postcard_proof.sql',
    'schema_v260924_drop_postcard_images.sql',
    'schema_v260926_practice_logged_days.sql',
    'schema_v260928_postcard_per_phrase_day.sql',
    'schema_v260928_anchor_postcards.sql',
    'schema_v260930_beat_three_days.sql',
  ]) {
    database.exec(readFileSync(new URL(`../schemas/${file}`, import.meta.url), 'utf8'));
  }
  const addNuv = database.prepare(`
    INSERT INTO nuv_transactions (id, user_id, amount, reason, reference_id, created_at)
    VALUES (?, ?, 1, 'daily_reflection', ?, ?)
  `);
  const addAccount = database.prepare(`
    INSERT INTO nuv_accounts (user_id, timezone, salt) VALUES (?, 'Asia/Seoul', ?)
  `);
  const addPostcard = database.prepare(`
    INSERT INTO digital_postcards
      (id, user_id, phrase_id, phrase, visit_days, preset, status, practiced_on,
       logged_days_at_issue, nuv_at_issue, issue_no, issued_at, saved_at)
    VALUES (?, ?, 'phrase-1', ?, 1, 'morning', 'saved', ?, ?, 0, ?, ?, ?)
  `);
  return { database, env: { DB: d1(database) }, addNuv, addAccount, addPostcard };
}

const SALT_1 = `0x${'11'.repeat(32)}`;
const SALT_2 = `0x${'22'.repeat(32)}`;
// 2026-09-29 00:30 KST — 09-28 하루를 새기는 시각.
const STAMP_AT = new Date('2026-09-28T15:30:00Z');

function seedTwoPeople({ addNuv, addAccount }) {
  addAccount.run('user-1', SALT_1);
  addAccount.run('user-2', SALT_2);
  addNuv.run('n1', 'user-1', '2026-09-27', '2026-09-26 23:00:00');
  addNuv.run('n2', 'user-1', '2026-09-28', '2026-09-27 23:00:00');
  addNuv.run('n3', 'user-2', '2026-09-28', '2026-09-28 10:00:00');
}

test('the stamp at 00:30 KST seals the Seoul day that just ended', async () => {
  const environment = createEnvironment();
  seedTwoPeople(environment);

  const stamp = await stampLedger(environment.env, STAMP_AT);

  assert.equal(stamp.day, '2026-09-28');
  assert.equal(stamp.people, 2);
  assert.equal(stamp.total_nuv, 3);
  assert.equal(stamp.status, 'awaiting_chain');
  assert.match(stamp.root, /^0x[0-9a-f]{64}$/);
  const row = environment.database.prepare('SELECT * FROM nuv_anchors').get();
  assert.equal(row.cutoff_at, '2026-09-28 15:30:00');
  assert.equal(row.root, stamp.root);
});

test('a proof verifies against the stamped root with the OpenZeppelin rules', async () => {
  const environment = createEnvironment();
  seedTwoPeople(environment);
  const stamp = await stampLedger(environment.env, STAMP_AT);

  const proof = await proofForUser(environment.env, 'user-1');

  assert.equal(proof.balance, 2);
  assert.equal(proof.commitment, commitmentOf('user-1', SALT_1));
  assert.ok(StandardMerkleTree.verify(
    stamp.root, ['bytes32', 'uint256'], [proof.commitment, '2'], proof.proof
  ));
  // 잔액을 부풀리면 같은 증명으로 통과하지 못한다.
  assert.ok(!StandardMerkleTree.verify(
    stamp.root, ['bytes32', 'uint256'], [proof.commitment, '3'], proof.proof
  ));
});

test('Nuv earned after the cutoff waits for the next stamp, and the old proof still holds', async () => {
  const environment = createEnvironment();
  seedTwoPeople(environment);
  const stamp = await stampLedger(environment.env, STAMP_AT);

  environment.addNuv.run('n4', 'user-1', '2026-09-29', '2026-09-28 23:00:00');
  const proof = await proofForUser(environment.env, 'user-1');

  assert.equal(proof.day, '2026-09-28');
  assert.equal(proof.root, stamp.root);
  assert.equal(proof.balance, 2);

  const next = await stampLedger(environment.env, new Date('2026-09-29T15:30:00Z'));
  assert.equal(next.day, '2026-09-29');
  assert.equal(next.total_nuv, 4);
  assert.notEqual(next.root, stamp.root);
});

test('a day is stamped once; running again changes nothing', async () => {
  const environment = createEnvironment();
  seedTwoPeople(environment);
  const first = await stampLedger(environment.env, STAMP_AT);

  environment.addNuv.run('late', 'user-2', 'late', '2026-09-28 15:40:00');
  const again = await stampLedger(environment.env, new Date('2026-09-28T15:45:00Z'));

  assert.equal(first.created, true);
  assert.equal(again.created, false);
  assert.equal(again.root, first.root);
  assert.equal(environment.database.prepare('SELECT COUNT(*) AS n FROM nuv_anchors').get().n, 1);
});

test('a ledger changed after the stamp refuses to hand out proofs', async () => {
  const environment = createEnvironment();
  seedTwoPeople(environment);
  await stampLedger(environment.env, STAMP_AT);

  // 도장 이전 시각으로 누브를 끼워 넣는 조작.
  environment.addNuv.run('forged', 'user-2', 'forged', '2026-09-20 00:00:00');

  await assert.rejects(proofForUser(environment.env, 'user-2'), /다르다/);
});

test('a Nuv holder without a salt fails the stamp instead of vanishing from it', async () => {
  const environment = createEnvironment();
  environment.addNuv.run('n1', 'ghost', '2026-09-28', '2026-09-28 01:00:00');

  await assert.rejects(stampLedger(environment.env, STAMP_AT), /ghost/);
});

test('an empty ledger stamps nothing', async () => {
  const environment = createEnvironment();
  assert.equal(await stampLedger(environment.env, STAMP_AT), null);
});

test('the commitment hides the user id behind the salt', () => {
  assert.notEqual(commitmentOf('user-1', SALT_1), commitmentOf('user-1', SALT_2));
  assert.ok(!commitmentOf('user-1', SALT_1).includes(Buffer.from('user-1').toString('hex')));
});

test('the accounts migration pins existing Nuv holders to Seoul with their own salt', () => {
  const database = new DatabaseSync(':memory:');
  database.exec(readFileSync(new URL('../schemas/schema_v260917_nuv.sql', import.meta.url), 'utf8'));
  const addNuv = database.prepare(`
    INSERT INTO nuv_transactions (id, user_id, amount, reason, reference_id) VALUES (?, ?, 1, 'daily_reflection', ?)
  `);
  addNuv.run('n1', 'user-1', '2026-09-27');
  addNuv.run('n2', 'user-1', '2026-09-28');
  addNuv.run('n3', 'user-2', '2026-09-28');

  database.exec(readFileSync(new URL('../schemas/schema_v260928_nuv_accounts.sql', import.meta.url), 'utf8'));

  const accounts = database.prepare('SELECT * FROM nuv_accounts ORDER BY user_id').all();
  assert.equal(accounts.length, 2);
  assert.deepEqual(accounts.map(a => a.timezone), ['Asia/Seoul', 'Asia/Seoul']);
  assert.match(accounts[0].salt, /^0x[0-9a-f]{64}$/);
  assert.notEqual(accounts[0].salt, accounts[1].salt);
});

function seedPostcards({ database, addAccount, addPostcard }) {
  addAccount.run('user-1', SALT_1);
  addPostcard.run('card-1', 'user-1', '오늘을 믿자', '2026-09-27', 3, 1, '2026-09-27 01:00:00', '2026-09-27 01:00:00');
  addPostcard.run('card-2', 'user-1', '천천히 가도 된다', '2026-09-28', 1, 2, '2026-09-28 02:00:00', '2026-09-28 02:00:00');
  // 봉인 뒤에 만든 엽서 — 다음 봉인을 기다린다.
  addPostcard.run('card-late', 'user-1', '늦게 만든 엽서', '2026-09-29', 0, 3, '2026-09-28 16:00:00', '2026-09-28 16:00:00');
  // 누브로 샀던 옛 엽서 — 번호가 없어서 봉인에 들어가지 않는다.
  database.prepare(`
    INSERT INTO digital_postcards (id, user_id, phrase_id, phrase, visit_days, preset, status, created_at)
    VALUES ('legacy', 'user-1', 'phrase-0', '옛 엽서', 10, 'morning', 'saved', '2026-09-18 00:00:00')
  `).run();
}

test('postcards are sealed with the Nuv, numbered cards only, up to the cutoff', async () => {
  const environment = createEnvironment();
  seedPostcards(environment);

  const stamp = await stampLedger(environment.env, STAMP_AT);

  assert.equal(stamp.postcards, 2);
  assert.match(stamp.postcard_root, /^0x[0-9a-f]{64}$/);
  // 누브가 하나도 없어도 엽서만으로 봉인된다. 누브 루트는 빈 값.
  assert.equal(stamp.people, 0);
  assert.equal(stamp.root, `0x${'00'.repeat(32)}`);
});

test('a sealed postcard proves its owner, number and content with the OpenZeppelin rules', async () => {
  const environment = createEnvironment();
  seedPostcards(environment);
  const stamp = await stampLedger(environment.env, STAMP_AT);

  const proof = await postcardProof(environment.env, 'user-1', 'card-2');

  assert.equal(proof.sealed, true);
  assert.equal(proof.issue_no, 2);
  assert.equal(proof.commitment, commitmentOf('user-1', SALT_1));
  assert.equal(proof.content_hash, postcardContentHash({
    phrase: '천천히 가도 된다', practiced_on: '2026-09-28', logged_days_at_issue: 1,
  }));
  assert.ok(StandardMerkleTree.verify(
    stamp.postcard_root, POSTCARD_LEAF_ENCODING,
    [proof.commitment, '2', proof.content_hash], proof.proof
  ));
  // 문장을 바꿔 치면 같은 증명으로 통과하지 못한다.
  const forged = postcardContentHash({ phrase: '다른 문장', practiced_on: '2026-09-28', logged_days_at_issue: 1 });
  assert.ok(!StandardMerkleTree.verify(
    stamp.postcard_root, POSTCARD_LEAF_ENCODING, [proof.commitment, '2', forged], proof.proof
  ));
});

test('a postcard made after the seal, or someone else\'s, has no proof yet', async () => {
  const environment = createEnvironment();
  seedPostcards(environment);
  await stampLedger(environment.env, STAMP_AT);

  assert.equal((await postcardProof(environment.env, 'user-1', 'card-late')).sealed, false);
  assert.equal((await postcardProof(environment.env, 'user-2', 'card-1')).sealed, false);
  assert.equal((await postcardProof(environment.env, 'user-1', 'legacy')).sealed, false);
});

test('a sealed postcard edited afterwards refuses to hand out proofs', async () => {
  const environment = createEnvironment();
  seedPostcards(environment);
  await stampLedger(environment.env, STAMP_AT);

  environment.database.prepare(`UPDATE digital_postcards SET phrase = '고친 문장' WHERE id = 'card-1'`).run();

  await assert.rejects(postcardProof(environment.env, 'user-1', 'card-1'), /다르다/);
});

test('a special postcard carries its kind in the fingerprint; a regular one keeps the old fingerprint', () => {
  const base = { phrase: '천천히 가도 된다', practiced_on: '2026-09-30', logged_days_at_issue: 3 };
  assert.equal(postcardContentHash({ ...base, kind: 'regular' }), postcardContentHash(base));
  assert.notEqual(postcardContentHash({ ...base, kind: 'beat_three_days' }), postcardContentHash(base));
});
