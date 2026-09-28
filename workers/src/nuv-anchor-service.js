import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { keccak256 } from 'ethereum-cryptography/keccak.js';
import { bytesToHex, concatBytes, hexToBytes, utf8ToBytes } from 'ethereum-cryptography/utils.js';
import { dateIn } from './phrase-dates.js';

// 누브 장부 도장.
//
// 하루에 한 번, 그 시각까지 원장에 쌓인 사람별 누적 누브를 한 줄씩 묶어 머클
// 루트 하나로 만든다. 그 루트를 체인에 새기면 "그날 장부가 이랬고 그 뒤로 아무도
// 바꾸지 않았다"가 증명되고, 나중에 코인을 나눠 줄 때 표준 claim 컨트랙트가 이
// 루트를 그대로 읽는다. 그래서 줄 모양은 OpenZeppelin StandardMerkleTree 규칙을
// 따른다 — MerkleProof.verify가 그대로 검증할 수 있는 모양이다.
//
// 누브는 차감이 없어 누적은 줄지 않는다. 그날의 증감이 아니라 누적을 새기므로
// 가장 최근 도장 하나로 전체 잔액이 증명되고, 하루가 빠져도 다음 도장이 덮는다.
//
// 체인에 올리는 건 도장 지갑이 준비된 뒤다. 그 전까지 루트는 여기
// (nuv_anchors, status = 'awaiting_chain')와 Discord 메시지에만 남는다.

export const LEDGER_TIMEZONE = 'Asia/Seoul';
const LEAF_ENCODING = ['bytes32', 'uint256'];
const HOUR_MS = 60 * 60 * 1000;

// 사용자 ID를 salt로 가린 값. 증명을 공유해도 내부 ID가 드러나지 않는다.
export function commitmentOf(userId, salt) {
  return `0x${bytesToHex(keccak256(concatBytes(utf8ToBytes(userId), hexToBytes(salt.replace(/^0x/, '')))))}`;
}

function sqliteTimestamp(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// 컷오프 시각 이전 원장만으로 트리를 만든다. 원장은 더하기만 되고 컷오프가
// 고정이라, 언제 다시 계산해도 같은 루트가 나온다 — 트리를 따로 저장하지 않는
// 이유다.
export async function buildLedgerTree(env, cutoffAt) {
  const { results } = await env.DB.prepare(`
    SELECT t.user_id, a.salt, SUM(t.amount) AS total
    FROM nuv_transactions t
    LEFT JOIN nuv_accounts a ON a.user_id = t.user_id
    WHERE t.created_at <= ?
    GROUP BY t.user_id
    HAVING total > 0
    ORDER BY t.user_id
  `).bind(cutoffAt).all();

  if (results.length === 0) return null;

  // salt 없는 사람을 조용히 빼면 그 사람의 누브가 도장에서 사라진다.
  const unsalted = results.filter(row => !row.salt).map(row => row.user_id);
  if (unsalted.length > 0) {
    throw new Error(`nuv_accounts에 salt가 없는 누브 보유자: ${unsalted.join(', ')}`);
  }

  const entries = results.map(row => ({
    userId: row.user_id,
    commitment: commitmentOf(row.user_id, row.salt),
    total: row.total,
  }));
  const tree = StandardMerkleTree.of(
    entries.map(entry => [entry.commitment, String(entry.total)]),
    LEAF_ENCODING
  );
  return {
    tree,
    entries,
    people: entries.length,
    totalNuv: entries.reduce((sum, entry) => sum + entry.total, 0),
  };
}

// 00:30 KST에 돌면 방금 끝난 하루(서울 기준)의 장부를 새긴다.
export async function stampLedger(env, now = new Date()) {
  const day = dateIn(LEDGER_TIMEZONE, new Date(now.getTime() - HOUR_MS));
  const existing = await env.DB.prepare(`
    SELECT day, root, people, total_nuv, status FROM nuv_anchors WHERE day = ?
  `).bind(day).first();
  if (existing) return { ...existing, created: false };

  const cutoffAt = sqliteTimestamp(now);
  const ledger = await buildLedgerTree(env, cutoffAt);
  if (!ledger) return null;

  await env.DB.prepare(`
    INSERT OR IGNORE INTO nuv_anchors (day, cutoff_at, root, people, total_nuv, status)
    VALUES (?, ?, ?, ?, ?, 'awaiting_chain')
  `).bind(day, cutoffAt, ledger.tree.root, ledger.people, ledger.totalNuv).run();

  return {
    day, root: ledger.tree.root, people: ledger.people,
    total_nuv: ledger.totalNuv, status: 'awaiting_chain', created: true,
  };
}

// 가장 최근 도장 기준으로 한 사람의 줄과 증명 경로. 다시 계산한 루트가 저장된
// 루트와 다르면 원장이 도장 뒤에 바뀌었다는 뜻이라 증명을 내주지 않는다.
export async function proofForUser(env, userId) {
  const anchor = await env.DB.prepare(`
    SELECT day, cutoff_at, root, status, tx_hash FROM nuv_anchors ORDER BY day DESC LIMIT 1
  `).first();
  if (!anchor) return null;

  const ledger = await buildLedgerTree(env, anchor.cutoff_at);
  if (ledger?.tree.root !== anchor.root) {
    throw new Error(`${anchor.day} 장부를 다시 계산한 루트가 새긴 루트와 다르다`);
  }
  const index = ledger.entries.findIndex(entry => entry.userId === userId);
  if (index < 0) return { day: anchor.day, root: anchor.root, status: anchor.status, balance: 0 };

  const entry = ledger.entries[index];
  return {
    day: anchor.day,
    root: anchor.root,
    status: anchor.status,
    tx_hash: anchor.tx_hash,
    balance: entry.total,
    commitment: entry.commitment,
    proof: ledger.tree.getProof(index),
  };
}

export function formatStampMessage(stamp) {
  return {
    embeds: [{
      title: `누브 장부 도장 — ${stamp.day}`,
      color: 0xa9603a,
      description: [
        `${stamp.people}명 · 누적 ${stamp.total_nuv}누브`,
        `루트 \`${stamp.root}\``,
        stamp.status === 'awaiting_chain' ? '체인 기록 대기 중 (도장 지갑 준비 전)' : `상태: ${stamp.status}`,
      ].join('\n'),
      timestamp: new Date().toISOString(),
    }],
  };
}
