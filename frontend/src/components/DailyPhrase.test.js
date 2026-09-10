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
  </div>
));
jest.mock('../utils/analytics', () => ({
  logPhraseOnboardingShown: jest.fn(), logPhraseExampleUsed: jest.fn(), logPhraseDayLogged: jest.fn(),
}));

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
  expect(JSON.parse(writes[0][1].body)).toEqual({ phrase: '새 문장' });
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
