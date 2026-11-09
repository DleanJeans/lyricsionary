import { cjkCharacterCount, draggedPhrase, groupCjkTokens, groupSpacedWords, isCjkWord } from '../src/utils/cjkWords';
import { removeSpecialChars, splitLyricTokens } from '../src/utils/cleanLyrics';
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

describe('Thai', () => {
  it('splits Thai into consonants with their vowels and tone marks', () => {
    expect(splitLyricTokens('ไม่เป็นไร')).toEqual(['ไม่', 'เป็', 'น', 'ไร']);
  });

  it('joins the characters of a saved Thai word', () => {
    expect(groupCjkTokens(splitLyricTokens('ฉันรักเธอ ความรัก'), (word) => word === 'ความรัก' || word === 'ฉัน'))
      .toEqual(['ฉัน', 'รั', 'ก', 'เธ', 'อ', ' ', 'ความรัก']);
  });

  it('keeps Thai vowel and tone marks when cleaning a word', () => {
    expect(removeSpecialChars('น้ำตา,')).toBe('น้ำตา');
    expect(cjkCharacterCount('ความรัก')).toBe(5);
  });
});

describe('Vietnamese', () => {
  const saved = new Set(['yêu thương', 'em']);
  const isWord = (word: string) => saved.has(word);

  it('joins the syllables of a saved word, keeping its punctuation', () => {
    expect(groupSpacedWords(splitLyricTokens('Anh yêu thương, em'), isWord)).toEqual(['Anh', ' ', 'yêu thương,', ' ', 'em']);
  });

  it("doesn't join syllables across lines", () => {
    expect(groupSpacedWords(splitLyricTokens('yêu\nthương'), isWord)).toEqual(['yêu', '\n', 'thương']);
  });

  it('counts each syllable of a saved word as known', () => {
    expect(countKnownWords('Anh yêu thương em', isWord, ['Vietnamese'])).toBe(3);
    expect(countWords('Anh yêu thương em')).toBe(4);
  });
});

describe('phrases', () => {
  it('counts each word of a saved phrase as known in any language', () => {
    expect(countKnownWords('I never give up, baby', (word: string) => word === 'give up', ['English'])).toBe(2);
  });
});

describe('draggedPhrase', () => {
  it('joins Chinese or Japanese characters dragged across, either way', () => {
    const tokens = splitLyricTokens('二人だけの空');
    expect(draggedPhrase(tokens, 0, 1)).toEqual({ word: '二人', from: 0, to: 1 });
    expect(draggedPhrase(tokens, 3, 0)).toEqual({ word: '二人だけ', from: 0, to: 3 });
  });

  it('joins words with single spaces between them, without their punctuation', () => {
    const tokens = splitLyricTokens('never give up, baby');
    expect(draggedPhrase(tokens, 2, 4).word).toBe('give up');
    expect(draggedPhrase(tokens, 6, 2)).toEqual({ word: 'give up baby', from: 2, to: 6 });
  });

  it('stops at a change of script or past the longest phrase', () => {
    expect(draggedPhrase(splitLyricTokens('好き love'), 0, 3).word).toBe('好き');
    expect(draggedPhrase(splitLyricTokens('a b c d e f g h i'), 0, 16).word).toBe('a b c d e f g h');
  });
});
