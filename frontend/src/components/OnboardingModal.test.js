/* eslint-disable testing-library/no-unnecessary-act -- direct React DOM rendering requires act */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import OnboardingModal from './OnboardingModal';

test('promises accrual rather than a gift, and completes onboarding', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const onComplete = jest.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => root.render(
    <OnboardingModal open onClose={jest.fn()} onComplete={onComplete} />,
  ));

  // 선물을 준다고 말하면 안 된다 — 누브는 되새긴 날의 수라서 줄 수가 없다.
  expect(document.body.textContent).not.toContain('선물');
  expect(document.body.textContent).not.toContain('드려요');
  expect(document.body.textContent).toContain('1 누브');
  expect(document.body.textContent).toContain('10 누브');
  await clickButton('첫 문장 고르기');
  expect(onComplete).toHaveBeenCalledTimes(1);

  await act(async () => root.unmount());
  container.remove();
});

async function clickButton(label) {
  const button = [...document.body.querySelectorAll('button')]
    .find((item) => item.textContent === label);
  expect(button).toBeDefined();
  await act(async () => button.click());
}


test('supports skipping onboarding', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const onComplete = jest.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => root.render(
    <OnboardingModal open onClose={jest.fn()} onComplete={onComplete} />,
  ));
  await clickButton('건너뛰기');
  expect(onComplete).toHaveBeenCalledTimes(1);

  await act(async () => root.unmount());
  container.remove();
});
