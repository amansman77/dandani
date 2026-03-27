import { getRequiredUserId } from './core.js';

export async function createTimefoldEnvelope(env, request) {
  const body = await request.json();
  const { challengeId, message, unlockDate } = body;
  const userId = getRequiredUserId(request);

  const timefoldResponse = await fetch('https://timefold.amansman77.workers.dev/api/envelopes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Token': userId
    },
    body: JSON.stringify({
      unlockAt: new Date(unlockDate).getTime(),
      passwordProtected: true,
      encryptedMessage: message,
      userToken: userId
    })
  });

  if (!timefoldResponse.ok) {
    throw new Error(`Timefold API error: ${timefoldResponse.status}`);
  }

  const timefoldData = await timefoldResponse.json();

  try {
    await env.DB.prepare(`
      INSERT INTO timefold_envelopes (id, challenge_id, user_id, created_at, unlock_at, timefold_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      challengeId,
      userId,
      Date.now(),
      new Date(unlockDate).getTime(),
      timefoldData.id
    ).run();
  } catch (dbError) {
    console.warn('Failed to save envelope to dandani DB:', dbError);
  }

  return {
    success: true,
    envelopeId: timefoldData.id,
    shareUrl: `https://timefold.yetimates.com/?v=3.0&id=${timefoldData.id}`,
    message: '봉투가 성공적으로 생성되었습니다.'
  };
}

export async function getTimefoldEnvelope(request) {
  const url = new URL(request.url);
  const envelopeId = url.pathname.split('/').pop();

  const timefoldResponse = await fetch(`https://timefold.amansman77.workers.dev/api/envelopes/${envelopeId}`, {
    headers: { 'X-User-Token': 'anonymous' }
  });

  if (!timefoldResponse.ok) {
    throw new Error(`Timefold API error: ${timefoldResponse.status}`);
  }

  return timefoldResponse.json();
}
