import { HttpError } from './http-errors.js';

export const ADMIN_PATHS = new Set([
  '/api/analytics/retention', '/api/analytics/activity', '/api/analytics/daily-report',
  '/api/discord/daily-report', '/api/discord/daily-insight', '/api/insight/debug',
]);
const MAX_AUTHORIZATION_LENGTH = 512;

async function tokensMatch(actual, expected) {
  const encoder = new TextEncoder();
  const digests = await Promise.all([actual, expected].map(token =>
    crypto.subtle.digest('SHA-256', encoder.encode(token))));
  const [left, right] = digests.map(digest => new Uint8Array(digest));
  let difference = 0;
  for (let i = 0; i < left.length; i += 1) difference |= left[i] ^ right[i];
  return difference === 0;
}

export async function requireAdmin(request, env) {
  const secret = env.ADMIN_API_TOKEN;
  if (typeof secret !== 'string' || !secret.trim()) {
    throw new HttpError(503, '운영 API가 설정되지 않았습니다.');
  }
  const authorization = request.headers.get('Authorization') || '';
  const match = authorization.length <= MAX_AUTHORIZATION_LENGTH && /^Bearer (\S+)$/i.exec(authorization);
  if (!match || !(await tokensMatch(match[1], secret))) {
    throw new HttpError(401, '운영 API 인증이 필요합니다.');
  }
}
