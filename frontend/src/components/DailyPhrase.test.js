/* eslint-disable testing-library/no-unnecessary-act -- direct React DOM rendering requires act */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import DailyPhrase from './DailyPhrase';

jest.mock('../utils/userId', () => ({ getUserId: () => 'test-user' }));
jest.mock('../utils/clientTime', () => ({
  getClientTimeHeaders: () => ({
    'X-Client-Time': '2026-09-11T16:00:00.000Z',
    'X-Client-Timezone': 'Asia/Seoul',
  }),
}));
jest.mock('../utils/analytics', () => ({
  logPhraseOnboardingShown: jest.fn(),
  logPhraseExampleUsed: jest.fn(),
  logPhraseDayLogged: jest.fn(),
}));
jest.mock('./PhrasePicker', () => ({ onWriteOwn }) => (
  <button type="button" onClick={onWriteOwn}>직접 쓰기</button>
));
jest.mock('./phraseVariants/VariantA', () => (props) => (
  <div>
    {props.phrase ? <span>{props.phrase.phrase}</span> : null}
    <input
      aria-label="문장"
      value={props.inputValue}
      onChange={(event) => props.setInputValue(event.target.value)}
    />
    <button type="button" onClick={() => props.onExampleSelect('천천히 해도 괜찮다')}>예시 선택</button>
    <button type="button" onClick={props.onSubmit}>문장 시작</button>
    {props.phrase ? <button type="button" onClick={props.onLogToday}>되새기기</button> : null}
  </div>
));

function jsonResponse(body, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 400, json: async () => body });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

test('starts a written phrase and logs today through the active API flow', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const activePhrase = {
    id: 'phrase-1', phrase: '천천히 해도 괜찮다', logged_today: false,
    logged_days: 0, logged_dates: [], visit_days: 1,
  };
  global.fetch = jest.fn()
    .mockImplementationOnce(() => jsonResponse({ phrase: null }))
    .mockImplementationOnce(() => jsonResponse({ id: 'phrase-1', phrase: activePhrase.phrase }))
    .mockImplementationOnce(() => jsonResponse({ phrase: activePhrase }))
    .mockImplementationOnce(() => jsonResponse({ logged_days: 1 }))
    .mockImplementationOnce(() => jsonResponse({
      phrase: { ...activePhrase, logged_today: true, logged_days: 1 },
    }));

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(
    <DailyPhrase
      isEditing={false}
      onEditingChange={jest.fn()}
      onActivePhraseChange={jest.fn()}
      onViewHistory={jest.fn()}
    />,
  ));
  await flush();

  await act(async () => container.querySelector('button').click());
  await act(async () => [...container.querySelectorAll('button')]
    .find((button) => button.textContent === '예시 선택').click());
  await act(async () => [...container.querySelectorAll('button')]
    .find((button) => button.textContent === '문장 시작').click());
  await flush();

  const createCall = global.fetch.mock.calls[1];
  assertApiCall(createCall, '/api/phrases', 'POST');
  expect(JSON.parse(createCall[1].body)).toEqual({ phrase: activePhrase.phrase, source: 'written' });

  await act(async () => [...container.querySelectorAll('button')]
    .find((button) => button.textContent === '되새기기').click());
  await flush();
  assertApiCall(global.fetch.mock.calls[3], '/api/phrases/phrase-1/log', 'POST');

  await act(async () => root.unmount());
  container.remove();
  delete global.fetch;
});

function assertApiCall([url, options], path, method) {
  expect(url).toContain(path);
  expect(options.method).toBe(method);
  expect(options.headers['X-User-ID']).toBe('test-user');
}
