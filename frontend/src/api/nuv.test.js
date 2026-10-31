import { fetchNuvBalance, fetchSavedPostcards, savePostcardBackground } from './nuv';

beforeEach(() => {
  localStorage.setItem('dandani_user_id', 'test-user');
  global.fetch = jest.fn();
});
afterEach(() => { delete global.fetch; });

test('the Nuv count is read for this user, and a failed response leaves it empty', async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ balance: 3 }) });
  expect(await fetchNuvBalance()).toBe(3);
  const [url, options] = fetch.mock.calls[0];
  expect(url).toMatch(/\/api\/nuv$/);
  expect(options.headers['X-User-ID']).toBe('test-user');
  fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
  expect(await fetchNuvBalance()).toBeNull();
});

test('the postcard box shows the server reason when it cannot load', async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ postcards: [{ id: 'c1' }] }) });
  expect(await fetchSavedPostcards()).toEqual([{ id: 'c1' }]);
  fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
  await expect(fetchSavedPostcards()).rejects.toThrow('엽서함을 불러오지 못했어요');
});

test('saving a background sends only the preset, and surfaces a refusal', async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ postcard: { id: 'c1' } }) });
  await savePostcardBackground('c1', 'dawn');
  const [url, options] = fetch.mock.calls[0];
  expect(url).toMatch(/\/api\/nuv\/postcards\/c1\/save$/);
  expect(options.method).toBe('POST');
  expect(JSON.parse(options.body)).toEqual({ preset: 'dawn' });
  fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: '작심삼일을 이겨내면 열려요.' }) });
  await expect(savePostcardBackground('c1', 'triumph')).rejects.toThrow('작심삼일을 이겨내면 열려요.');
});
