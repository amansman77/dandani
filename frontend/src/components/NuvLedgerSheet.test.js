/* eslint-disable testing-library/no-unnecessary-act -- direct React DOM rendering requires act */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import NuvLedgerSheet from './NuvLedgerSheet';

async function openLedger(ledger) {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ledger });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<NuvLedgerSheet open onClose={jest.fn()} />));
  return async () => {
    await act(async () => root.unmount());
    container.remove();
  };
}

test('lists each reflected day with its phrase and when the ledger was last sealed', async () => {
  const close = await openLedger({
    total: 2,
    days: [
      { day: '2026-09-27', phrase: '천천히 가도 된다' },
      { day: '2026-09-26', phrase: '오늘을 믿자' },
    ],
    last_sealed_day: '2026-09-26',
  });
  const text = document.body.textContent;

  expect(global.fetch.mock.calls[0][0]).toContain('/api/nuv/ledger');
  expect(text).toContain('9월 27일천천히 가도 된다');
  expect(text).toContain('9월 26일오늘을 믿자');
  expect(text).toContain('마지막 봉인 9월 26일');
  // 누브는 보상도 재화도 아니다 — 받는 말, 잔액, 체인·코인 이야기를 하지 않는다.
  for (const word of ['받', '잔액', '코인', '체인', '지갑']) expect(text).not.toContain(word);

  await close();
});

test('an empty ledger says how the first Nuv is made, and when the first seal comes', async () => {
  const close = await openLedger({ total: 0, days: [], last_sealed_day: null });

  expect(document.body.textContent).toContain('오늘 문장을 되새기면 첫 누브가 남아요');
  expect(document.body.textContent).toContain('첫 봉인은 오늘 밤이에요');

  await close();
});
