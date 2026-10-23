import { dateIn } from './phrase-dates.js';

// 작심삼일(beat_three_days) 판정. 오늘 화면의 연속 일수 안내, 작심삼일 엽서
// 발행, "이겨낸 아침"(triumph) 배경 잠금 해제가 모두 이 판정 하나를 쓴다.
//
// 작심삼일을 이겨낸 엽서 — 같은 문장을 3일 연속 되새기면 발행할 수 있다.
// 한 번 3일 연속을 해냈으면 그 뒤에 하루 쉬어도 자격은 남는다. 이미 이긴 것이다.
export const BEAT_THREE_DAYS_STREAK = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// 'YYYY-MM-DD' 목록에서 가장 긴 연속 일수. 날짜 문자열을 UTC 정오로 읽어
// 서머타임 경계에서도 하루가 23·25시간으로 흔들리지 않게 한다.
export function longestStreak(dates) {
  const days = [...new Set(dates)].sort().map(date => Date.parse(`${date}T12:00:00Z`) / DAY_MS);
  let best = 0;
  let run = 0;
  days.forEach((day, index) => {
    run = index > 0 && day - days[index - 1] === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

// 오늘(또는 어제)에서 끝나는 연속 일수. 오늘 아직 안 되새겼으면 어제까지를 센다.
export function currentStreak(dates, today) {
  const set = new Set(dates);
  const at = offset => new Date(Date.parse(`${today}T12:00:00Z`) - offset * DAY_MS).toISOString().slice(0, 10);
  let offset = set.has(today) ? 0 : 1;
  let run = 0;
  while (set.has(at(offset))) { run += 1; offset += 1; }
  return run;
}

// 작심삼일은 앱이 보낸 날짜(log_date)가 아니라 서버가 기록한 시각(created_at)을
// 그 사람의 고정된 시간대로 읽어 판정한다. log_date는 앱이 보낸 시간대를 따르는데,
// 같은 순간에도 UTC−12·서울·UTC+14는 날짜가 하루씩 달라서 헤더만 바꿔 보내면
// 1분 안에 "3일 연속"이 됐다(2026-09-30 로컬에서 재현). 누브의 하루와 같은 기준이다.
// 시간대가 아직 없는 사람(되새기면 곧바로 생긴다)은 서울로 본다.
const FALLBACK_TIMEZONE = 'Asia/Seoul';

function serverDay(createdAt, timezone) {
  return dateIn(timezone, new Date(`${createdAt.replace(' ', 'T')}Z`));
}

async function pinnedTimezone(env, userId) {
  const account = await env.DB.prepare(`
    SELECT timezone FROM nuv_accounts WHERE user_id = ?
  `).bind(userId).first();
  return account?.timezone || FALLBACK_TIMEZONE;
}

// 이 문장을 실제로 되새긴 날들(고정 시간대 기준, 중복 없음).
export async function reflectedDays(env, userId, phraseId) {
  const timezone = await pinnedTimezone(env, userId);
  const { results } = await env.DB.prepare(`
    SELECT created_at FROM daily_phrase_logs WHERE phrase_id = ? AND user_id = ?
  `).bind(phraseId, userId).all();
  return [...new Set(results.map(row => serverDay(row.created_at, timezone)))];
}

// 어느 문장으로든 3일 연속을 한 번이라도 해냈는가. "이겨낸 아침" 배경이
// 열리는 조건이다 — 특별한 엽서를 받았는지가 아니라 이겨냈는지로 본다.
export async function hasBeatenThreeDays(env, userId) {
  const timezone = await pinnedTimezone(env, userId);
  const { results } = await env.DB.prepare(`
    SELECT phrase_id, created_at FROM daily_phrase_logs WHERE user_id = ?
  `).bind(userId).all();
  const byPhrase = new Map();
  results.forEach(row => byPhrase.set(
    row.phrase_id, [...(byPhrase.get(row.phrase_id) || []), serverDay(row.created_at, timezone)]
  ));
  return [...byPhrase.values()].some(days => longestStreak(days) >= BEAT_THREE_DAYS_STREAK);
}

// 오늘 화면의 "작심삼일을 이겨냈어요"와 발행 가능 여부가 같은 판정을 쓴다.
// (예전엔 화면은 모든 되새김으로, 발행은 오늘까지로 따로 판단해 어긋날 수 있었다.)
export async function beatThreeDaysState(env, userId, phraseId, now = new Date()) {
  const days = await reflectedDays(env, userId, phraseId);
  const issued = await env.DB.prepare(`
    SELECT id FROM digital_postcards
    WHERE user_id = ? AND phrase_id = ? AND kind = 'beat_three_days'
  `).bind(userId, phraseId).first();
  return {
    streak_goal: BEAT_THREE_DAYS_STREAK,
    streak: currentStreak(days, dateIn(await pinnedTimezone(env, userId), now)),
    reached: longestStreak(days) >= BEAT_THREE_DAYS_STREAK,
    postcard_id: issued?.id || null,
    // 문장과 상관없이, 이 사람에게 "이겨낸 아침" 배경이 열렸는가.
    background_unlocked: await hasBeatenThreeDays(env, userId),
  };
}
