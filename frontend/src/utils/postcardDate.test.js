import { formatPostcardDay, postcardCaption } from './postcardDate';

test('formats the postcard day from its parts, not through a timezone-shifted Date', () => {
  expect(formatPostcardDay('2026-09-01')).toBe('2026년 9월 1일');
  expect(formatPostcardDay('2026-09')).toBe('');
  expect(formatPostcardDay(null)).toBe('');
});

test('captions the day with the reflected days, or the day alone before any', () => {
  expect(postcardCaption('2026-10-22', 31)).toBe('2026년 10월 22일 · 되새김 31일');
  expect(postcardCaption('2026-10-22', 0)).toBe('2026년 10월 22일');
  expect(postcardCaption(undefined, 3)).toBe('');
});
