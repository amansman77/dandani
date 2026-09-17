import { getRequiredUserId } from './service-utils.js';

export const REFLECTION_REWARD = 1;
export const POSTCARD_COST = 10;
export const WELCOME_GRANT = 10;

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

async function getBalance(env, userId) {
  const wallet = await env.DB.prepare(`
    SELECT balance FROM nuv_wallets WHERE user_id = ?
  `).bind(userId).first();
  return wallet?.balance || 0;
}

export async function getNuvWallet(env, request) {
  const userId = getRequiredUserId(request);
  return { balance: await getBalance(env, userId), postcard_cost: POSTCARD_COST };
}

export async function claimWelcomeNuv(env, request) {
  const userId = getRequiredUserId(request);
  const result = await env.DB.prepare(`
    INSERT OR IGNORE INTO nuv_transactions
      (id, user_id, amount, reason, reference_id)
    VALUES (?, ?, ?, 'welcome_grant', 'welcome')
  `).bind(generateId('nuv'), userId, WELCOME_GRANT).run();

  return {
    awarded_nuv: result.meta.changes === 1 ? WELCOME_GRANT : 0,
    balance: await getBalance(env, userId),
    postcard_cost: POSTCARD_COST,
  };
}

export async function awardNuvForReflection(env, userId, phraseId, logDate) {
  const referenceId = `${phraseId}:${logDate}`;
  const result = await env.DB.prepare(`
    INSERT OR IGNORE INTO nuv_transactions
      (id, user_id, amount, reason, reference_id)
    SELECT ?, ?, ?, 'daily_reflection', ?
    WHERE EXISTS (
      SELECT 1 FROM daily_phrase_logs
      WHERE phrase_id = ? AND user_id = ? AND log_date = ?
    )
  `).bind(
    generateId('nuv'), userId, REFLECTION_REWARD, referenceId,
    phraseId, userId, logDate
  ).run();

  return {
    awarded_nuv: result.meta.changes === 1 ? REFLECTION_REWARD : 0,
    balance: await getBalance(env, userId),
  };
}

export async function createPostcardWithNuv(env, request) {
  const userId = getRequiredUserId(request);
  const { phrase_id: phraseId } = await request.json();
  if (!phraseId || typeof phraseId !== 'string') {
    throw new Error('phrase_id is required');
  }

  const phrase = await env.DB.prepare(`
    SELECT id FROM daily_phrases
    WHERE id = ? AND user_id = ? AND status = 'active'
  `).bind(phraseId, userId).first();
  if (!phrase) {
    throw new Error(`Active phrase not found: ${phraseId}`);
  }

  const result = await env.DB.prepare(`
    INSERT INTO nuv_transactions (id, user_id, amount, reason, reference_id)
    SELECT ?, ?, ?, 'postcard_creation', ?
    FROM nuv_wallets
    WHERE user_id = ? AND balance >= ?
  `).bind(
    generateId('nuv'), userId, -POSTCARD_COST, generateId('postcard'),
    userId, POSTCARD_COST
  ).run();
  const balance = await getBalance(env, userId);

  return {
    created: result.meta.changes === 1,
    balance,
    cost: POSTCARD_COST,
  };
}
