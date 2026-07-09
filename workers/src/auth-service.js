const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

function getCallbackUrl(request) {
  return new URL('/api/auth/google/callback', request.url).href;
}

export async function initiateGoogleAuth(env, request) {
  const url = new URL(request.url);
  const anonymousId = url.searchParams.get('anonymous_id') || '';

  const state = btoa(JSON.stringify({ anonymous_id: anonymousId }));
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: getCallbackUrl(request),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });

  return Response.redirect(`${GOOGLE_AUTH_URL}?${params}`, 302);
}

async function mergeAnonymousData(env, sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;

  // 1. action_flows: 현재 브라우저 기록을 기존 계정으로 이전
  await env.DB.prepare(
    `UPDATE action_flows SET anonymous_id = ? WHERE anonymous_id = ?`
  ).bind(targetId, sourceId).run();

  // 2. action_patterns: success/fail 누적 합산
  const sourcePatterns = await env.DB.prepare(
    `SELECT action_type, success, fail FROM action_patterns WHERE anonymous_id = ?`
  ).bind(sourceId).all();

  for (const p of (sourcePatterns.results || [])) {
    await env.DB.prepare(`
      INSERT INTO action_patterns (anonymous_id, action_type, success, fail)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (anonymous_id, action_type) DO UPDATE SET
        success = success + excluded.success,
        fail = fail + excluded.fail,
        updated_at = CURRENT_TIMESTAMP
    `).bind(targetId, p.action_type, p.success || 0, p.fail || 0).run();
  }
  await env.DB.prepare(
    `DELETE FROM action_patterns WHERE anonymous_id = ?`
  ).bind(sourceId).run();

  // 3. identity_dandanis: 이전
  await env.DB.prepare(
    `UPDATE identity_dandanis SET anonymous_id = ? WHERE anonymous_id = ?`
  ).bind(targetId, sourceId).run();

  // 4. user_profiles: 기존 계정에 이름이 없을 때만 가져옴
  const targetProfile = await env.DB.prepare(
    `SELECT name FROM user_profiles WHERE anonymous_id = ? AND name IS NOT NULL AND name != ''`
  ).bind(targetId).first();

  if (!targetProfile) {
    const sourceProfile = await env.DB.prepare(
      `SELECT name FROM user_profiles WHERE anonymous_id = ?`
    ).bind(sourceId).first();
    if (sourceProfile?.name) {
      await env.DB.prepare(`
        INSERT INTO user_profiles (anonymous_id, name) VALUES (?, ?)
        ON CONFLICT (anonymous_id) DO UPDATE SET name = excluded.name, updated_at = CURRENT_TIMESTAMP
      `).bind(targetId, sourceProfile.name).run();
    }
  }
}

export async function handleGoogleCallback(env, request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateStr = url.searchParams.get('state') || '';
  const frontendUrl = env.FRONTEND_URL || 'https://dandani.pages.dev';

  if (!code) {
    return Response.redirect(`${frontendUrl}?auth_error=no_code`, 302);
  }

  let anonymousId = '';
  try {
    const state = JSON.parse(atob(stateStr));
    anonymousId = state.anonymous_id || '';
  } catch {}

  // Exchange code for access token
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: getCallbackUrl(request),
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return Response.redirect(`${frontendUrl}?auth_error=token_failed`, 302);
  }

  // Get Google user info
  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userInfo = await userRes.json();

  if (!userInfo.id) {
    return Response.redirect(`${frontendUrl}?auth_error=user_info_failed`, 302);
  }

  // 기존 계정 조회
  const existing = await env.DB.prepare(
    `SELECT anonymous_id FROM user_sessions WHERE google_id = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(userInfo.id).first();

  let sessionAnonymousId;
  if (existing && existing.anonymous_id && existing.anonymous_id !== anonymousId) {
    // 기존 계정 있음 + 다른 브라우저 → 현재 기록을 기존 계정으로 병합
    await mergeAnonymousData(env, anonymousId, existing.anonymous_id);
    sessionAnonymousId = existing.anonymous_id;
  } else {
    // 첫 로그인이거나 동일 브라우저
    sessionAnonymousId = anonymousId;
  }

  const token = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO user_sessions (token, anonymous_id, google_id, email, display_name) VALUES (?, ?, ?, ?, ?)`
  ).bind(token, sessionAnonymousId, userInfo.id, userInfo.email || '', userInfo.name || '').run();

  return Response.redirect(`${frontendUrl}?session_token=${token}`, 302);
}

export async function getAuthSession(env, request) {
  const token = request.headers.get('X-Session-Token');
  if (!token) return null;
  return env.DB.prepare(
    `SELECT anonymous_id, google_id, email, display_name FROM user_sessions WHERE token = ?`
  ).bind(token).first();
}

export async function getMe(env, request) {
  const session = await getAuthSession(env, request);
  if (!session) return { authenticated: false };
  return {
    authenticated: true,
    email: session.email,
    name: session.display_name,
  };
}

export async function logout(env, request) {
  const token = request.headers.get('X-Session-Token');
  if (token) {
    await env.DB.prepare(`DELETE FROM user_sessions WHERE token = ?`).bind(token).run();
  }
  return { success: true };
}
