import { deriveRetentionState, generateFeedback, getStreakMessage } from './retention';

const toISODate = (offsetDays) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString();
};

describe('retention utils', () => {
  test('deriveRetentionState computes active streak and totals', () => {
    const records = [
      { created_at: toISODate(-2) },
      { created_at: toISODate(-1) },
      { created_at: toISODate(0) }
    ];

    const state = deriveRetentionState(records, new Date());
    expect(state.streakDays).toBe(3);
    expect(state.totalActions).toBe(3);
    expect(state.lastActionDate).toBeTruthy();
  });

  test('deriveRetentionState resets streak when a day is missed', () => {
    const records = [
      { created_at: toISODate(-4) },
      { created_at: toISODate(-2) }
    ];

    const state = deriveRetentionState(records, new Date());
    expect(state.streakDays).toBe(0);
    expect(state.totalActions).toBe(2);
  });

  test('feedback template matches streak ranges', () => {
    expect(generateFeedback(2)).toBe('시작했다는 것 자체가 이미 단단함입니다');
    expect(generateFeedback(6)).toBe('반복 속에서 중심이 만들어지고 있어요');
    expect(generateFeedback(10)).toBe('이건 습관이 아니라 태도가 되고 있어요');
    expect(getStreakMessage(3)).toContain('3일째');
  });
});
