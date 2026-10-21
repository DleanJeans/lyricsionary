import { countWordOccurrences } from '../src/utils/wordFrequency';

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

  it('excludes ignored words', () => {
    const result = countWordOccurrences(songs, (word, language) => word.toLowerCase() === 'liebe' && language === 'German');
    expect(result.find((w) => w.language === 'German' && w.word.toLowerCase() === 'liebe')).toBeUndefined();
  });
});
