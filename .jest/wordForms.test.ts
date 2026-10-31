import type { WordEntry } from '../src/types';
import { findSavedWord, hasSpelling, mergeWordEntries } from '../src/utils/wordForms';
import { songWordIndex, gapWord } from '../src/utils/lyricGaps';

const entry = (over: Partial<WordEntry>): WordEntry => ({
  id: over.word ?? 'x',
  word: 'x',
  language: 'French',
  pronunciation: '',
  contexts: [],
  lastLookedUp: 0,
  ...over,
});

describe('mergeWordEntries', () => {
  const veux = entry({
    word: 'veux',
    contexts: [{ context: 'Je veux', songId: 's1' }],
    masteryLevel: 'Seen',
    quiz: { streak: 1, correct: 1, wrong: 2, lastWrongAt: 50 },
    savedAt: 100,
    lastLookedUp: 300,
  });
  const voulez = entry({
    word: 'voulez',
    contexts: [{ context: 'Vous voulez', songId: 's2' }, { context: 'Je veux', songId: 's1' }],
    masteryLevel: 'Recognized',
    quiz: { streak: 2, correct: 5, wrong: 0, lastCountedDay: '2026-10-30', lastCorrectAt: 90 },
    savedAt: 50,
    lastLookedUp: 200,
    note: 'vous form',
  });
  const merged = mergeWordEntries(veux, voulez);

  it('keeps every context once, and the form', () => {
    expect(merged.word).toBe('veux');
    expect(merged.contexts.map((c) => c.context)).toEqual(['Je veux', 'Vous voulez']);
    expect(merged.forms).toEqual(['voulez']);
    expect(merged.note).toBe('vous form');
  });

  it('keeps the higher level with its streak, and adds up the answers', () => {
    expect(merged.masteryLevel).toBe('Recognized');
    expect(merged.quiz).toMatchObject({ streak: 2, lastCountedDay: '2026-10-30', correct: 6, wrong: 2, lastWrongAt: 50, lastCorrectAt: 90 });
    expect(merged.savedAt).toBe(50);
    expect(merged.lastLookedUp).toBe(300);
  });

  it("carries the merged word's own forms", () => {
    const again = mergeWordEntries(entry({ word: 'vouloir' }), merged);
    expect(again.forms).toEqual(['veux', 'voulez']);
  });
});

describe('finding a merged form', () => {
  const vouloir = entry({ word: 'vouloir', forms: ['veux'] });
  const words = [vouloir, entry({ word: 'Veux', language: 'English' })];

  it('finds the word by a form, in its language', () => {
    expect(hasSpelling(vouloir, 'VEUX')).toBe(true);
    expect(findSavedWord(words, 'veux', 'French')).toBe(vouloir);
    expect(findSavedWord(words, 'veux', 'English')?.language).toBe('English');
  });

  it('prefers a word saved with that spelling over a form', () => {
    const veux = entry({ word: 'veux' });
    expect(findSavedWord([vouloir, veux], 'veux', 'French')).toBe(veux);
    expect(songWordIndex([vouloir, veux], ['French']).get('veux')).toBe(veux);
  });

  it("indexes forms for the lyrics, but doesn't make them gaps", () => {
    const known = entry({ word: 'vouloir', forms: ['veux'], masteryLevel: 'Recalled' });
    const index = songWordIndex([known], ['French']);
    expect(index.get('veux')).toBe(known);
    expect(gapWord(index, 'veux', Date.now())).toBeUndefined();
    expect(gapWord(index, 'vouloir', Date.now())).toBe(known);
  });
});
