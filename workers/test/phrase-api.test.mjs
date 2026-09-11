import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../src/router.js';
import { createPhraseDbFake } from './support/phrase-db-fake.mjs';

const API_URL = 'https://example.test/api/phrases';
const TEST_HEADERS = {
  'Content-Type': 'application/json',
  'X-User-ID': 'user-1',
  'X-Client-Time': '2026-09-11T16:00:00.000Z',
  'X-Client-Timezone': 'Asia/Seoul',
};

function request(path = '', options = {}) {
  return new Request(`${API_URL}${path}`, {
    headers: TEST_HEADERS,
    ...options,
  });
}

async function responseJson(response) {
  return { status: response.status, body: await response.json() };
}

test('phrase lifecycle creates, reads, logs once per day, and retires an active phrase', async () => {
  const DB = createPhraseDbFake();
  const created = await responseJson(await handleRequest(request('', {
    method: 'POST',
    body: JSON.stringify({ phrase: '  오늘도 천천히  ', source: 'written' }),
  }), { DB }));

  assert.equal(created.status, 200);
  assert.equal(created.body.phrase, '오늘도 천천히');
  assert.equal(DB.state.events.length, 1);

  const active = await responseJson(await handleRequest(request('/active'), { DB }));
  assert.equal(active.body.phrase.logged_today, false);
  assert.equal(active.body.phrase.visit_days, 1);

  const phrasePath = `/${created.body.id}`;
  const firstLog = await responseJson(await handleRequest(request(`${phrasePath}/log`, { method: 'POST' }), { DB }));
  const duplicateLog = await responseJson(await handleRequest(request(`${phrasePath}/log`, { method: 'POST' }), { DB }));
  assert.deepEqual(firstLog.body, { logged_days: 1 });
  assert.deepEqual(duplicateLog.body, { logged_days: 1 });

  const retired = await responseJson(await handleRequest(request(`${phrasePath}/retire`, { method: 'POST' }), { DB }));
  assert.deepEqual(retired.body, { success: true });

  const afterRetire = await responseJson(await handleRequest(request('/active'), { DB }));
  assert.deepEqual(afterRetire.body, { phrase: null });
});

test('phrase API rejects missing identity, blank phrases, duplicates, and unknown phrases', async () => {
  const DB = createPhraseDbFake();
  const missingIdentity = new Request(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phrase: '문장' }),
  });
  assert.equal((await responseJson(await handleRequest(missingIdentity, { DB }))).status, 400);

  const blank = await responseJson(await handleRequest(request('', {
    method: 'POST',
    body: JSON.stringify({ phrase: '   ' }),
  }), { DB }));
  assert.deepEqual(blank, { status: 400, body: { error: 'phrase is required' } });

  await handleRequest(request('', {
    method: 'POST',
    body: JSON.stringify({ phrase: '첫 문장' }),
  }), { DB });
  const duplicate = await responseJson(await handleRequest(request('', {
    method: 'POST',
    body: JSON.stringify({ phrase: '두 번째 문장' }),
  }), { DB }));
  assert.deepEqual(duplicate, { status: 400, body: { error: 'active phrase already exists' } });

  const unknownLog = await responseJson(await handleRequest(request('/missing/log', { method: 'POST' }), { DB }));
  assert.deepEqual(unknownLog, { status: 400, body: { error: 'Phrase not found: missing' } });
});
