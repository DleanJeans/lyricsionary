import { countKnownWords, countWordOccurrences, countWords } from '../src/utils/wordFrequency';

describe('countWordOccurrences', () => {
  const songs = [
    { originalLyrics: 'Ich liebe dich,\nich liebe dich nicht!', originalLanguages: ['German'] },
    { originalLyrics: 'Liebe ist alles (Liebe) 123', originalLanguages: ['German'] },
    { originalLyrics: "je t'aime, liebe", originalLanguages: ['French'] },
  ];

  it('sorts words by occurrences', () => {
    const result = countWordOccurrences(songs);
    expect(result[0]).toEqual({ word: 'liebe', language: 'German', count: 4, songCount: 2 });
    expect(result.slice(1, 3).map((w) => w.word)).toEqual(['dich', 'Ich']);
  });

  it('groups words case-insensitively and keeps the most common spelling', () => {
    const result = countWordOccurrences([{ originalLyrics: 'Ich ich Ich', originalLanguages: ['German'] }]);
    expect(result).toEqual([{ word: 'Ich', language: 'German', count: 3, songCount: 1 }]);
  });

  it("spells a word as it's written within a line rather than at a line's start", () => {
    const result = countWordOccurrences([
      { originalLyrics: 'Des bijoux\nDes fleurs\nun peu des deux', originalLanguages: ['French'] },
    ]);
    expect(result[0]).toEqual({ word: 'des', language: 'French', count: 3, songCount: 1 });
  });

  it('counts the number of songs a word appears in', () => {
    const result = countWordOccurrences([
      { originalLyrics: 'Herz Herz', originalLanguages: ['German'] },
      { originalLyrics: 'Herz', originalLanguages: ['German'] },
    ]);
    expect(result).toEqual([{ word: 'Herz', language: 'German', count: 3, songCount: 2 }]);
  });

  it('keeps languages separate and skips numbers and punctuation', () => {
    const result = countWordOccurrences(songs);
    expect(result.find((w) => w.word === '123')).toBeUndefined();
    expect(result.filter((w) => w.word.toLowerCase() === 'liebe').map((w) => w.language)).toContain('French');
  });

  it('counts French and Italian elisions as the word they are about', () => {
    const result = countWordOccurrences([
      { originalLyrics: "J'aime, je t'aime, aime-moi aujourd'hui", originalLanguages: ['French'] },
      { originalLyrics: "dell'umanità umanità", originalLanguages: ['Italian'] },
      { originalLyrics: "I'm here", originalLanguages: ['English'] },
    ]);
    expect(result.find((w) => w.word === 'aime')).toMatchObject({ language: 'French', count: 2 });
    expect(result.find((w) => w.word === "aujourd'hui")).toMatchObject({ count: 1 });
    expect(result.find((w) => w.word === 'umanità')).toMatchObject({ language: 'Italian', count: 2 });
    expect(result.find((w) => w.word === "I'm")).toMatchObject({ language: 'English', count: 1 });
  });

  it("counts German shortened words as their full form", () => {
    const result = countWordOccurrences([{ originalLyrics: "Ich hab' es, wir hab'n es, haben", originalLanguages: ['German'] }]);
    expect(result.find((w) => w.word === 'haben')).toMatchObject({ count: 2 });
    expect(result.find((w) => w.word === 'habe')).toMatchObject({ count: 1 });
  });

  it('excludes ignored words', () => {
    const result = countWordOccurrences(songs, (word, language) => word.toLowerCase() === 'liebe' && language === 'German');
    expect(result.find((w) => w.language === 'German' && w.word.toLowerCase() === 'liebe')).toBeUndefined();
  });
});

describe('countKnownWords', () => {
  it('counts every occurrence of known words, ignoring case and punctuation', () => {
    const known = new Set(['liebe', 'dich']);
    expect(countKnownWords('Ich liebe dich,\nich LIEBE dich nicht!', (w) => known.has(w.toLowerCase()))).toBe(4);
  });

  it('counts a French elision as known when the word it is about is', () => {
    const known = new Set(['aime', "l'"]);
    expect(countKnownWords("Je t'aime, l'amour", (w) => known.has(w.toLowerCase()), ['French'])).toBe(1);
    expect(countKnownWords("Je t'aime", (w) => known.has(w.toLowerCase()), ['English'])).toBe(0);
  });

  it('returns 0 when nothing is known', () => {
    expect(countKnownWords('la la la', () => false)).toBe(0);
  });
});

describe('countWords', () => {
  it('skips dashes, ellipses, numbers and repeat markers so a fully known song reaches 100%', () => {
    const lyrics = 'Oh — oh...\n... (x2)\n2 3 4 & go! 2x';
    expect(countWords(lyrics)).toBe(3);
    expect(countKnownWords(lyrics, () => true)).toBe(countWords(lyrics));
  });
});

describe('countWordOccurrences languages', () => {
  it('counts songs saved with a language code and with its name together', () => {
    const result = countWordOccurrences([
      { originalLyrics: 'bonjour', originalLanguages: ['fr'] },
      { originalLyrics: 'Bonjour', originalLanguages: ['French'] },
    ]);
    expect(result).toEqual([{ word: 'bonjour', language: 'French', count: 2, songCount: 2 }]);
  });
});
