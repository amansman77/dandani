import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import {
  commitmentOf,
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
  return { database, env: { DB: d1(database) }, addNuv, addAccount };
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
