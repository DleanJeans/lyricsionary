import { cjkCharacterCount, groupCjkTokens, isCjkWord } from '../src/utils/cjkWords';
import { splitLyricTokens } from '../src/utils/cleanLyrics';
import { countKnownWords, countWords } from '../src/utils/wordFrequency';

describe('splitLyricTokens', () => {
  it('splits Chinese and Japanese into characters, keeping a long vowel mark on its kana', () => {
    expect(splitLyricTokens('「ラーメン」 好き')).toEqual(['「', 'ラー', 'メ', 'ン', '」', ' ', '好', 'き']);
  });

  it('keeps Latin words and spaces whole', () => {
    expect(splitLyricTokens("je t'aime  fort")).toEqual(['je', ' ', "t'aime", '  ', 'fort']);
  });
});

describe('groupCjkTokens', () => {
  const saved = new Set(['二人', '二人だけ', '空']);
  const isWord = (word: string) => saved.has(word);

  it('joins characters into the longest saved word', () => {
    expect(groupCjkTokens(splitLyricTokens('二人だけの空'), isWord)).toEqual(['二人だけ', 'の', '空']);
  });

  it('leaves other tokens alone', () => {
    expect(groupCjkTokens(['Hello', ' ', '二', '人'], isWord)).toEqual(['Hello', ' ', '二人']);
  });
});

describe('isCjkWord and cjkCharacterCount', () => {
  it('tells Chinese and Japanese words apart and counts their characters', () => {
    expect(isCjkWord('二人')).toBe(true);
    expect(isCjkWord('「')).toBe(false);
    expect(isCjkWord('love')).toBe(false);
    expect(cjkCharacterCount('ラーメン')).toBe(3);
  });
});

describe('counting Japanese words', () => {
  it('counts each character, and the characters of saved words as known', () => {
    const lyrics = '二人だけの空が\n広がる夜に';
    expect(countWords(lyrics)).toBe(12);
    const saved = new Set(['二人', '夜']);
    expect(countKnownWords(lyrics, (word: string) => saved.has(word), ['Japanese'])).toBe(3);
  });
});
