/* eslint-disable testing-library/no-unnecessary-act -- direct React DOM rendering requires act */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import OnboardingModal from './OnboardingModal';

test('introduces the welcome Nuv and completes onboarding', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const onComplete = jest.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => root.render(
    <OnboardingModal open onClose={jest.fn()} onComplete={onComplete} />,
  ));

  expect(document.body.textContent).toContain('처음 만난 선물');
  expect(document.body.textContent).toContain('10 누브');
  expect(document.body.textContent).toContain('나만의 디지털 엽서');
  await clickButton('10 누브 받고 첫 엽서 만들기');
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
