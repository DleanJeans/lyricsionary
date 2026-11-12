import { splitDashedWords, splitEdgePunctuation, splitLyricTokens } from '../src/utils/cleanLyrics';

describe('words split at dashes', () => {
  it('splits a translation at an em dash between words, keeping the dash on the word before', () => {
    const words = splitDashedWords('On the desk chair—even the floor is perfect');
    expect(words.map((w) => w.text)).toEqual(['On', 'the', 'desk', 'chair—', 'even', 'the', 'floor', 'is', 'perfect']);
    expect(words[4].start).toBe('On the desk chair—'.length);
  });

  it('splits at en dashes and keeps a spaced dash as its own token', () => {
    expect(splitDashedWords('yes–no — maybe').map((w) => w.text)).toEqual(['yes–', 'no', '—', 'maybe']);
  });

  it("doesn't split hyphenated words", () => {
    expect(splitDashedWords('a well-known song').map((w) => w.text)).toEqual(['a', 'well-known', 'song']);
    expect(splitLyricTokens('ein Rock-Song')).toEqual(['ein', ' ', 'Rock-Song']);
  });

  it('splits lyric tokens at dashes so each word can be tapped', () => {
    expect(splitLyricTokens('Ich—du und wir')).toEqual(['Ich—', 'du', ' ', 'und', ' ', 'wir']);
    expect(splitEdgePunctuation('Ich—').core).toBe('Ich');
  });
});
