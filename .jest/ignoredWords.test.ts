import { isWordIgnored, makeIgnoredWordChecker } from '../src/store/useStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
// uuid ships ES modules only, which Jest doesn't transform
jest.mock('uuid', () => ({ v4: () => 'id' }));

describe('makeIgnoredWordChecker', () => {
  const ignoredWords = [
    { word: 'la', language: 'French' },
    { word: 'oh', language: 'English' },
  ];

  it('answers like isWordIgnored', () => {
    const isIgnored = makeIgnoredWordChecker(ignoredWords);
    for (const [word, language] of [['La', 'French'], ['la', 'Spanish'], ['oh', 'English'], ['ohh', 'English']]) {
      expect(isIgnored(word, language)).toBe(isWordIgnored(ignoredWords, word, language));
    }
    expect(isIgnored('LA', 'French')).toBe(true);
    expect(isIgnored('la', 'Spanish')).toBe(false);
  });
});
