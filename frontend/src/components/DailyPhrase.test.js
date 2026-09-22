/* eslint testing-library/no-unnecessary-act: "off" -- Uses React DOM directly; act is required. */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import DailyPhrase from './DailyPhrase';

jest.mock('./phraseVariants/VariantA', () => props => (
  <div>
    <span>{props.phrase?.phrase}</span>
    <input aria-label="문장" value={props.inputValue} onChange={e => props.setInputValue(e.target.value)} />
    <button onClick={() => props.onExampleSelect('새 문장')}>예시</button>
    <button disabled={props.submitting} onClick={props.onSubmit}>저장</button>
    {props.phrase && <button onClick={props.onLogToday}>되새기기</button>}
    {props.onBackToPicker && <button onClick={props.onBackToPicker}>다시 고르기</button>}
  </div>
));
jest.mock('../utils/analytics', () => ({
  logPhraseOnboardingShown: jest.fn(), logPhraseExampleUsed: jest.fn(), logPhraseDayLogged: jest.fn(),
}));
jest.mock('./PhrasePicker', () => ({ onPick, onWriteOwn }) => (
  <div>
    <button type="button" onClick={() => onPick('고른 문장')}>문장 고르기</button>
    <button type="button" onClick={onWriteOwn}>직접 쓰기</button>
  </div>
));

let container;
let root;
const original = { id: 'original', phrase: '이전 문장' };
const reply = (body, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 500, json: async () => body });

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem('dandani_user_id', 'test-user');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  delete global.fetch;
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

async function openEditor() {
  await act(async () => root.render(<DailyPhrase isEditing onEditingChange={jest.fn()} />));
  await act(async () => Array.from(container.querySelectorAll('button')).find(b => b.textContent === '예시').click());
}

async function save() {
  await act(async () => Array.from(container.querySelectorAll('button')).find(b => b.textContent === '저장').click());
}

test('editing uses one replacement request, never a separate retirement', async () => {
  global.fetch = jest.fn((url, options) => {
    if (options?.method === 'POST') return reply({ id: 'replacement', phrase: '새 문장' });
    return reply({ phrase: original });
  });
  await openEditor();
  await save();
  const writes = fetch.mock.calls.filter(([, options]) => options.method === 'POST');
  expect(writes).toHaveLength(1);
  expect(writes[0][0]).toMatch(/\/api\/phrases\/original\/replace$/);
  expect(JSON.parse(writes[0][1].body)).toEqual({ phrase: '새 문장', source: 'written' });
});

test('failed replacement keeps the form and original phrase available for retry', async () => {
  let attempts = 0;
  global.fetch = jest.fn((url, options) => {
    if (options?.method === 'POST') {
      attempts += 1;
      return attempts === 1 ? reply({ error: '저장 실패' }, false) : reply({ id: 'replacement' });
    }
    return reply({ phrase: original });
  });
  await openEditor();
  await save();
  expect(container.querySelector('input')?.value).toBe('새 문장');
  expect(container.textContent).toContain('이전 문장');
  expect(container.textContent).toContain('저장 실패');
  await save();
  expect(attempts).toBe(2);
});


test('starts a written phrase and logs today through the active API flow', async () => {
  const activePhrase = {
    id: 'phrase-1', phrase: '새 문장', logged_today: false,
    logged_days: 0, logged_dates: [], visit_days: 1,
  };
  global.fetch = jest.fn()
    .mockImplementationOnce(() => reply({ phrase: null }))
    .mockImplementationOnce(() => reply({ id: 'phrase-1', phrase: activePhrase.phrase }))
    .mockImplementationOnce(() => reply({ phrase: activePhrase }))
    .mockImplementationOnce(() => reply({ logged_days: 1 }))
    .mockImplementationOnce(() => reply({ phrase: { ...activePhrase, logged_today: true, logged_days: 1 } }));

  await act(async () => root.render(
    <DailyPhrase isEditing={false} onEditingChange={jest.fn()} onActivePhraseChange={jest.fn()} onViewHistory={jest.fn()} />,
  ));
  await act(async () => Array.from(container.querySelectorAll('button')).find(b => b.textContent === '직접 쓰기').click());
  await act(async () => Array.from(container.querySelectorAll('button')).find(b => b.textContent === '예시').click());
  await save();

  const createCall = fetch.mock.calls[1];
  expect(createCall[0]).toMatch(/\/api\/phrases$/);
  expect(JSON.parse(createCall[1].body)).toEqual({ phrase: activePhrase.phrase, source: 'written' });

  await act(async () => Array.from(container.querySelectorAll('button')).find(b => b.textContent === '되새기기').click());
  expect(fetch.mock.calls[3][0]).toMatch(/\/api\/phrases\/phrase-1\/log$/);
});


test('a picked phrase can return to the picker and preserves its source', async () => {
  const selected = { id: 'picked', phrase: '고른 문장' };
  global.fetch = jest.fn((url, options) => {
    if (options?.method === 'POST') return reply(selected);
    return fetch.mock.calls.length === 1 ? reply({ phrase: null }) : reply({ phrase: selected });
  });

  await act(async () => root.render(
    <DailyPhrase isEditing={false} onEditingChange={jest.fn()} onActivePhraseChange={jest.fn()} onViewHistory={jest.fn()} />,
  ));
  const button = label => Array.from(container.querySelectorAll('button')).find(item => item.textContent === label);
  await act(async () => button('문장 고르기').click());
  expect(container.querySelector('input').value).toBe('고른 문장');
  await act(async () => button('다시 고르기').click());
  expect(button('문장 고르기')).toBeDefined();
  await act(async () => button('문장 고르기').click());
  await save();

  const write = fetch.mock.calls.find(([, options]) => options?.method === 'POST');
  expect(JSON.parse(write[1].body)).toEqual({ phrase: '고른 문장', source: 'picked' });
});
