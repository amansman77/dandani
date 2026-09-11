/* eslint-disable testing-library/no-unnecessary-act -- direct React DOM rendering requires act */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import OnboardingModal from './OnboardingModal';

test('advances through onboarding and completes on the final action', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const onComplete = jest.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => root.render(
    <OnboardingModal open onClose={jest.fn()} onComplete={onComplete} />,
  ));

  expect(document.body.textContent).toContain('감정이 쉽게');
  await clickButton('다음');
  expect(document.body.textContent).toContain('아침마다');
  await clickButton('다음');
  expect(document.body.textContent).toContain('쌓인 아침들이');
  await clickButton('지금 첫 문장 적으러 가기');
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
