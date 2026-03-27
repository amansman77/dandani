import { getClampedPracticeDay } from './challengeDay';

describe('challengeDay utils', () => {
  test('getClampedPracticeDay prefers practice.day and clamps by total_days', () => {
    const challenge = { id: 1, total_days: 7 };
    expect(getClampedPracticeDay({ day: 3 }, challenge)).toBe(3);
    expect(getClampedPracticeDay({ day: 10 }, challenge)).toBe(7);
  });

  test('getClampedPracticeDay falls back to calculated day and keeps lower bound', () => {
    const challenge = { id: 9999, total_days: 5 };
    expect(getClampedPracticeDay(null, challenge)).toBe(1);
    expect(getClampedPracticeDay({ day: 0 }, challenge)).toBe(1);
  });
});
