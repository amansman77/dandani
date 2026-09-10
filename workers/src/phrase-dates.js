function dateFormatter(timezone) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });
  }
}

export function phraseDateContext(request) {
  const formatter = dateFormatter(request.headers.get('X-Client-Timezone'));
  const format = date => {
    const parts = formatter.formatToParts(date);
    return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
  };
  return { today: format(new Date()), format };
}

function utcTimestamp(value) {
  const normalized = value.replace(' ', 'T');
  return new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(normalized) ? normalized : `${normalized}Z`);
}

export async function countPhraseVisits(db, phrase, logs, dates, userId) {
  const { results } = await db.prepare(`
    SELECT DISTINCT created_at FROM user_events
    WHERE user_id = ? AND event_type = 'page_visit' AND created_at >= ?
  `).bind(userId, phrase.started_at).all();
  const visited = new Set(logs.map(log => log.log_date));
  for (const visit of results) {
    const timestamp = utcTimestamp(visit.created_at);
    if (!Number.isNaN(timestamp.getTime())) visited.add(dates.format(timestamp));
  }
  // Today's request counts once, even before the asynchronous page_visit arrives.
  return [...visited].filter(date => date < dates.today).length + 1;
}
