import { getRequiredUserId } from './service-utils.js';

export const REFLECTION_REWARD = 1;
export const POSTCARD_COST = 10;
export const WELCOME_GRANT = 10;
const POSTCARD_PRESETS = new Set(['morning', 'dawn', 'paper', 'light']);
const MAX_POSTCARD_IMAGE_BYTES = 1800000;

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
  const granted = await env.DB.prepare(`
    INSERT OR IGNORE INTO nuv_transactions
      (id, user_id, amount, reason, reference_id)
    VALUES (?, ?, ?, 'welcome_grant', 'welcome')
    RETURNING amount
  `).bind(generateId('nuv'), userId, WELCOME_GRANT).first();

  return {
    awarded_nuv: granted?.amount || 0,
    balance: await getBalance(env, userId),
    postcard_cost: POSTCARD_COST,
  };
}

export async function awardNuvForReflection(env, userId, phraseId, logDate) {
  const referenceId = `${phraseId}:${logDate}`;
  const granted = await env.DB.prepare(`
    INSERT OR IGNORE INTO nuv_transactions
      (id, user_id, amount, reason, reference_id)
    SELECT ?, ?, ?, 'daily_reflection', ?
    WHERE EXISTS (
      SELECT 1 FROM daily_phrase_logs
      WHERE phrase_id = ? AND user_id = ? AND log_date = ?
    )
    RETURNING amount
  `).bind(
    generateId('nuv'), userId, REFLECTION_REWARD, referenceId,
    phraseId, userId, logDate
  ).first();

  return {
    awarded_nuv: granted?.amount || 0,
    balance: await getBalance(env, userId),
  };
}

export async function createPostcardWithNuv(env, request) {
  const userId = getRequiredUserId(request);
  const { phrase_id: phraseId, visit_days: visitDaysValue } = await request.json();
  if (!phraseId || typeof phraseId !== 'string') {
    throw new Error('phrase_id is required');
  }
  const visitDays = Number.isInteger(visitDaysValue) && visitDaysValue > 0 ? visitDaysValue : 1;

  const phrase = await env.DB.prepare(`
    SELECT id FROM daily_phrases
    WHERE id = ? AND user_id = ? AND status = 'active'
  `).bind(phraseId, userId).first();
  if (!phrase) {
    throw new Error(`Active phrase not found: ${phraseId}`);
  }

  const postcardId = generateId('postcard');
  const debit = env.DB.prepare(`
    INSERT INTO nuv_transactions (id, user_id, amount, reason, reference_id)
    SELECT ?, ?, ?, 'postcard_creation', ?
    FROM nuv_wallets
    WHERE user_id = ? AND balance >= ?
    RETURNING amount
  `).bind(
    generateId('nuv'), userId, -POSTCARD_COST, postcardId,
    userId, POSTCARD_COST
  );
  const createDraft = env.DB.prepare(`
    INSERT INTO digital_postcards
      (id, user_id, phrase_id, phrase, visit_days, preset, status)
    SELECT ?, ?, id, phrase, ?, 'morning', 'draft'
    FROM daily_phrases
    WHERE id = ? AND user_id = ? AND status = 'active'
      AND EXISTS (
        SELECT 1 FROM nuv_transactions
        WHERE user_id = ? AND reason = 'postcard_creation' AND reference_id = ?
      )
    RETURNING id
  `).bind(postcardId, userId, visitDays, phraseId, userId, userId, postcardId);

  await env.DB.batch([debit, createDraft]);
  const postcard = await env.DB.prepare(`
    SELECT id FROM digital_postcards WHERE id = ? AND user_id = ?
  `).bind(postcardId, userId).first();
  const balance = await getBalance(env, userId);

  return {
    created: Boolean(postcard),
    postcard_id: postcard?.id || null,
    balance,
    cost: POSTCARD_COST,
  };
}

export async function savePostcard(env, postcardId, request) {
  const userId = getRequiredUserId(request);
  const { preset } = await request.json();
  if (!POSTCARD_PRESETS.has(preset)) {
    throw new Error('invalid postcard preset');
  }

  const postcard = await env.DB.prepare(`
    UPDATE digital_postcards
    SET preset = ?, status = 'saved', saved_at = COALESCE(saved_at, datetime('now'))
    WHERE id = ? AND user_id = ?
    RETURNING id, phrase, visit_days, preset, created_at, saved_at
  `).bind(preset, postcardId, userId).first();
  if (!postcard) {
    throw new Error(`Postcard not found: ${postcardId}`);
  }
  return { postcard };
}

export async function getSavedPostcards(env, request) {
  const userId = getRequiredUserId(request);
  const { results } = await env.DB.prepare(`
    SELECT id, phrase, visit_days, preset, created_at, saved_at, download_token
    FROM digital_postcards
    WHERE user_id = ? AND status = 'saved'
    ORDER BY saved_at DESC, created_at DESC
  `).bind(userId).all();
  const origin = new URL(request.url).origin;
  return {
    postcards: results.map(({ download_token: downloadToken, ...postcard }) => ({
      ...postcard,
      download_url: downloadToken
        ? `${origin}/api/nuv/postcard-files/${downloadToken}`
        : null,
    })),
  };
}

export async function uploadPostcardImage(env, postcardId, request) {
  const userId = getRequiredUserId(request);
  const contentType = request.headers.get('Content-Type')?.split(';')[0];
  if (contentType !== 'image/png') {
    throw new Error('postcard image must be image/png');
  }

  const image = await request.arrayBuffer();
  if (image.byteLength === 0 || image.byteLength > MAX_POSTCARD_IMAGE_BYTES) {
    throw new Error(`postcard image must be between 1 and ${MAX_POSTCARD_IMAGE_BYTES} bytes`);
  }

  const token = crypto.randomUUID().replaceAll('-', '');
  const postcard = await env.DB.prepare(`
    UPDATE digital_postcards
    SET image_data = ?, image_mime = 'image/png',
        download_token = COALESCE(download_token, ?)
    WHERE id = ? AND user_id = ? AND status = 'saved'
    RETURNING download_token
  `).bind(image, token, postcardId, userId).first();
  if (!postcard) {
    throw new Error(`Saved postcard not found: ${postcardId}`);
  }

  const origin = new URL(request.url).origin;
  return { download_url: `${origin}/api/nuv/postcard-files/${postcard.download_token}` };
}

export async function downloadPostcardImage(env, token) {
  if (!/^[a-f0-9]{32}$/.test(token)) {
    return new Response('Not Found', { status: 404 });
  }
  const postcard = await env.DB.prepare(`
    SELECT image_data, image_mime FROM digital_postcards
    WHERE download_token = ? AND status = 'saved' AND image_data IS NOT NULL
  `).bind(token).first();
  if (!postcard) {
    return new Response('Not Found', { status: 404 });
  }

  return new Response(postcard.image_data, {
    headers: {
      'Content-Type': postcard.image_mime || 'image/png',
      'Content-Disposition': 'attachment; filename="dandani-postcard.png"',
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
