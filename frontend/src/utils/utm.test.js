import { getUTMFromURL, hasAnyUTM } from './utm';

test('parses and trims supported UTM parameters', () => {
  const utm = getUTMFromURL(
    'https://example.com/?utm_source=%20newsletter%20&utm_medium=email&utm_campaign=morning'
  );

  expect(utm).toEqual({
    utm_source: 'newsletter',
    utm_medium: 'email',
    utm_campaign: 'morning',
  });
  expect(hasAnyUTM(utm)).toBe(true);
});

test('returns an empty UTM shape for an invalid URL', () => {
  jest.spyOn(console, 'debug').mockImplementation(() => {});

  const utm = getUTMFromURL('not-a-url');

  expect(utm).toEqual({
    utm_source: undefined,
    utm_medium: undefined,
    utm_campaign: undefined,
  });
  expect(hasAnyUTM(utm)).toBe(false);
  console.debug.mockRestore();
});
