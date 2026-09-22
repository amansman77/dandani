/* eslint testing-library/no-unnecessary-act: "off" -- Uses React DOM directly; act is required. */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import VariantA from './VariantA';

jest.mock('../CommunityTicker', () => () => null);
let container;
let root;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test('the active view displays the server date and completed action opens history', async () => {
  const onViewHistory = jest.fn();
  const phrase = { phrase: '나의 문장', today: '2026-09-11', logged_today: true, logged_dates: ['2026-09-11'], visit_days: 2 };
  await act(async () => root.render(<VariantA phrase={phrase} onViewHistory={onViewHistory} />));
  expect(container.textContent).toContain('2026년 9월 11일');
  expect(container.textContent).toContain('2번째 아침이에요');
  await act(async () => container.querySelector('button[aria-label^="오늘도"]').click());
  expect(onViewHistory).toHaveBeenCalledTimes(1);
});

test('the editor disables empty submissions', async () => {
  const onSubmit = jest.fn();
  await act(async () => root.render(<VariantA inputValue=" " onSubmit={onSubmit} />));
  const submit = Array.from(container.querySelectorAll('button')).find(button => button.textContent === '이 문장으로 시작할게요');
  expect(submit.disabled).toBe(true);
});
