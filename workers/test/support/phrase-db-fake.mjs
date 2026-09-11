// Test-only D1 contract fake. It intentionally supports only SQL issued by
// phrase-service.js and core.logUserEvent; unsupported queries fail loudly.
export function createPhraseDbFake() {
  const state = {
    phrases: [],
    logs: [],
    events: [],
  };

  return {
    state,
    prepare(sql) {
      return createStatement(state, normalizeSql(sql));
    },
  };
}

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function createStatement(state, sql) {
  let values = [];
  return {
    bind(...boundValues) {
      values = boundValues;
      return this;
    },
    first() {
      return executeFirst(state, sql, values);
    },
    all() {
      return executeAll(state, sql, values);
    },
    run() {
      return executeRun(state, sql, values);
    },
  };
}

function executeFirst(state, sql, values) {
  if (sql.includes("SELECT id FROM daily_phrases WHERE user_id = ? AND status = 'active'")) {
    const phrase = state.phrases.find((item) => item.user_id === values[0] && item.status === 'active');
    return phrase ? { id: phrase.id } : null;
  }
  if (sql.includes('SELECT id, phrase, status, started_at FROM daily_phrases')) {
    return findActivePhrase(state, values[0]);
  }
  if (sql.includes('SELECT COUNT(DISTINCT d) AS visit_days')) {
    return { visit_days: countVisitDays(state, values) };
  }
  if (sql.includes('SELECT id, status FROM daily_phrases WHERE id = ? AND user_id = ?')) {
    const phrase = state.phrases.find((item) => item.id === values[0] && item.user_id === values[1]);
    return phrase ? { id: phrase.id, status: phrase.status } : null;
  }
  throw new Error(`Unsupported phrase DB first query: ${sql}`);
}

function executeAll(state, sql, values) {
  if (sql.includes('SELECT log_date FROM daily_phrase_logs WHERE phrase_id = ?')) {
    const logs = state.logs
      .filter((item) => item.phrase_id === values[0])
      .map(({ log_date }) => ({ log_date }));
    return { results: sql.includes('DESC') ? logs.reverse() : logs };
  }
  if (sql.includes('SELECT id, phrase, status, started_at, retired_at FROM daily_phrases')) {
    return { results: state.phrases.filter((item) => item.user_id === values[0]).toReversed() };
  }
  if (sql.includes("WHERE status = 'active' AND user_id != ?")) {
    return { results: state.phrases.filter((item) => item.status === 'active' && item.user_id !== values[0]) };
  }
  if (sql.includes('SELECT COUNT(*) as cnt FROM daily_phrase_logs WHERE phrase_id = ?')) {
    return { results: [{ cnt: state.logs.filter((item) => item.phrase_id === values[0]).length }] };
  }
  throw new Error(`Unsupported phrase DB all query: ${sql}`);
}

function executeRun(state, sql, values) {
  if (sql.startsWith('INSERT INTO daily_phrases')) {
    const [id, userId, phrase] = values;
    state.phrases.push({
      id,
      user_id: userId,
      phrase,
      status: 'active',
      started_at: '2026-09-12 00:00:00',
      retired_at: null,
    });
    return { meta: { changes: 1 } };
  }
  if (sql.startsWith('INSERT INTO user_events')) {
    state.events.push(values);
    return { meta: { changes: 1 } };
  }
  if (sql.startsWith('INSERT OR IGNORE INTO daily_phrase_logs')) {
    const [id, phraseId, userId, logDate] = values;
    const exists = state.logs.some((item) => item.phrase_id === phraseId && item.log_date === logDate);
    if (!exists) state.logs.push({ id, phrase_id: phraseId, user_id: userId, log_date: logDate });
    return { meta: { changes: exists ? 0 : 1 } };
  }
  if (sql.startsWith("UPDATE daily_phrases SET status = 'retired'")) {
    const phrase = state.phrases.find(
      (item) => item.id === values[0] && item.user_id === values[1] && item.status === 'active',
    );
    if (!phrase) return { meta: { changes: 0 } };
    phrase.status = 'retired';
    phrase.retired_at = '2026-09-12 01:00:00';
    return { meta: { changes: 1 } };
  }
  throw new Error(`Unsupported phrase DB run query: ${sql}`);
}

function findActivePhrase(state, userId) {
  const phrase = state.phrases.find((item) => item.user_id === userId && item.status === 'active');
  return phrase ? { ...phrase } : null;
}

function countVisitDays(state, [userId, startedAt, today, phraseId]) {
  const eventDays = state.events
    .filter(([eventUserId, eventType]) => eventUserId === userId && eventType === 'page_visit')
    .map((event) => event.created_at?.slice(0, 10))
    .filter((date) => date && date >= startedAt.slice(0, 10) && date < today);
  const logDays = state.logs
    .filter((item) => item.phrase_id === phraseId && item.log_date < today)
    .map((item) => item.log_date);
  return new Set([...eventDays, ...logDays]).size;
}
