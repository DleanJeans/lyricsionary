import { highlightWord, lineTranslation, wordOfTheDay } from '../src/utils/wordOfTheDay';
import type { Song, WordEntry } from '../src/types';

const word = (id: string, level: WordEntry['masteryLevel'], definition?: string): WordEntry => ({
  id,
  word: id,
  language: 'fr',
  pronunciation: '',
  lastLookedUp: 0,
  masteryLevel: level,
  contexts: definition ? [{ context: `line with ${id}`, definition, songId: 's1' }] : [],
});

describe('wordOfTheDay', () => {
  it('picks the same word all day, from words being learned', () => {
    const words = [word('a', 'Seen', 'one'), word('b', 'Known', 'two'), word('c', 'Recalled', 'three'), word('d', 'Seen')];
    const pick = wordOfTheDay(words, '2026-10-31');
    expect(pick && ['a', 'c']).toContain(pick!.entry.id);
    expect(wordOfTheDay([...words].reverse(), '2026-10-31')!.entry.id).toBe(pick!.entry.id);
    expect(pick!.context.context).toBe(`line with ${pick!.entry.id}`);
  });

  it('falls back to Known words, and to nothing without meanings', () => {
    expect(wordOfTheDay([word('b', 'Known', 'two')], '2026-10-31')!.entry.id).toBe('b');
    expect(wordOfTheDay([word('d', 'Seen')], '2026-10-31')).toBeNull();
  });
});

const song = (translations: Song['translations']): Song => ({
  id: 's',
  songName: 'In Der Zeit Verlieren',
  artistName: '',
  originalLyrics: "Willst du meine wahre Seele seh'n\nmusst du mit mir im Regen steh'n",
  translations,
  createdAt: 0,
  updatedAt: 0,
});

describe('highlightWord', () => {
  it('finds the word whatever its case', () => {
    expect(highlightWord("Willst du meine wahre Seele seh'n", ['willst'])).toEqual({
      before: '',
      word: 'Willst',
      after: " du meine wahre Seele seh'n",
    });
  });

  it('picks the saved occurrence', () => {
    expect(highlightWord('du und du', ['du'], 2)).toEqual({ before: 'du und ', word: 'du', after: '' });
  });

  it('falls back to a merged form, and to nothing', () => {
    expect(highlightWord('ich will dich', ['willst', 'will'])?.word).toBe('will');
    expect(highlightWord('ich bin', ['willst'])).toBeNull();
  });
});

describe('lineTranslation', () => {
  it('reads the line from each translation, leaving out Romanized', () => {
    const s = song([
      { language: 'English', lyrics: 'If you want to see my true soul\nyou must stand with me in the rain' },
      { language: 'Romanized', lyrics: "Willst du meine wahre Seele seh'n\nx" },
    ]);
    expect(lineTranslation(s, "Willst du meine wahre Seele seh'n")).toBe('If you want to see my true soul');
    expect(lineTranslation(s, "Willst du meine wahre Seele seh'n\nmusst du mit mir im Regen steh'n")).toBe(
      'If you want to see my true soul\nyou must stand with me in the rain'
    );
  });

  it('is null with no translation or an unknown line', () => {
    expect(lineTranslation(song([]), "Willst du meine wahre Seele seh'n")).toBeNull();
    expect(lineTranslation(song([{ language: 'English', lyrics: 'a\nb' }]), 'not in the song')).toBeNull();
  });
});
