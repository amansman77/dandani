import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateChallengeDayFromStart,
  getClientLocalDate,
} from '../src/core.js';

test('getClientLocalDate applies the requested timezone date', () => {
  const date = getClientLocalDate('2026-09-11T16:00:00.000Z', 'Asia/Seoul');
  assert.equal(date.toISOString(), '2026-09-12T00:00:00.000Z');
});

test('getClientLocalDate falls back safely for an invalid timezone', () => {
  const date = getClientLocalDate('2026-09-11T16:00:00.000Z', 'Invalid/Timezone');
  assert.equal(date.toISOString(), '2026-09-11T00:00:00.000Z');
});

test('calculateChallengeDayFromStart clamps days to the challenge boundary', () => {
  const currentDate = new Date('2026-09-20T00:00:00.000Z');
  assert.equal(calculateChallengeDayFromStart('2026-09-12', currentDate, 7), 7);
});

test('calculateChallengeDayFromStart returns day one for invalid input', () => {
  assert.equal(calculateChallengeDayFromStart('not-a-date', new Date(), 7), 1);
});
