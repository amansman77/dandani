import { fetchActivePhrase, savePhrase, logPhraseToday } from './phraseApi';

beforeEach(() => {
  localStorage.setItem('dandani_user_id', 'test-user');
  global.fetch = jest.fn();
});
afterEach(() => { delete global.fetch; });

test('new phrase creation sends the common user and timezone headers', async () => {
  fetch.mockResolvedValue({ ok: true, json: async () => ({ id: 'new' }) });
  expect(await savePhrase('  새 문장  ')).toEqual({ id: 'new' });
  const [url, options] = fetch.mock.calls[0];
  expect(url).toMatch(/\/api\/phrases$/);
  expect(JSON.parse(options.body)).toEqual({ phrase: '새 문장' });
  expect(options.headers['X-User-ID']).toBe('test-user');
  expect(options.headers['X-Client-Timezone']).toBeTruthy();
});

test('network failure shows a retryable message', async () => {
  fetch.mockRejectedValue(new TypeError('Failed to fetch'));
  await expect(fetchActivePhrase()).rejects.toThrow('네트워크를 확인');
});

test('invalid JSON response shows a readable failure', async () => {
  fetch.mockResolvedValue({ ok: false, json: async () => { throw new SyntaxError('HTML'); } });
  await expect(logPhraseToday('original')).rejects.toThrow('서버 응답을 읽지 못했어요');
});

test('a server conflict is displayed without retrying the write automatically', async () => {
  fetch.mockResolvedValue({ ok: false, json: async () => ({ error: '문장이 이미 변경됐어요.' }) });
  await expect(savePhrase('다른 문장', 'original')).rejects.toThrow('문장이 이미 변경됐어요.');
  expect(fetch).toHaveBeenCalledTimes(1);
});
