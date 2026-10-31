import { wordOfTheDay } from '../src/utils/wordOfTheDay';
import type { WordEntry } from '../src/types';

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
