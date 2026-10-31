import type { WordEntry } from '../src/types';
import { buildReviewItems, dueWords, findWordInLine, lineWords } from '../src/utils/reviewQuiz';
import { isDue } from '../src/utils/wordQuiz';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = new Date(2026, 9, 31, 12).getTime();
const today = '2026-10-31';

let nextId = 0;
const word = (text: string, definition: string, extra: Partial<WordEntry> = {}, line = ''): WordEntry => ({
  id: String(++nextId),
  word: text,
  language: 'fr',
  pronunciation: '',
  contexts: [{ context: line, definition, songId: 's1', translation: line ? `translated ${text}` : undefined }],
  lastLookedUp: 0,
  ...extra,
});

describe('isDue', () => {
  it('is due for a new word, and not for a Known one', () => {
    expect(isDue({}, now)).toBe(true);
    expect(isDue({ masteryLevel: 'Known' }, now)).toBe(false);
  });

  it('waits out the cooldown', () => {
    expect(isDue({ quiz: { streak: 1, correct: 1, wrong: 0, lastAnsweredAt: now - HOUR } }, now)).toBe(false);
    expect(isDue({ quiz: { streak: 1, correct: 1, wrong: 0, lastAnsweredAt: now - 5 * HOUR } }, now)).toBe(true);
  });

  it('asks a Recognized word once a day', () => {
    const quiz = { streak: 1, correct: 4, wrong: 0, lastAnsweredAt: now - 5 * HOUR };
    expect(isDue({ masteryLevel: 'Recognized', quiz: { ...quiz, lastCountedDay: today } }, now)).toBe(false);
    expect(isDue({ masteryLevel: 'Recognized', quiz: { ...quiz, lastCountedDay: '2026-10-30' } }, now)).toBe(true);
  });

  it('asks a Recalled word after 14 days', () => {
    const quiz = { streak: 0, correct: 6, wrong: 0 };
    expect(isDue({ masteryLevel: 'Recalled', quiz: { ...quiz, lastAnsweredAt: now - 3 * DAY } }, now)).toBe(false);
    expect(isDue({ masteryLevel: 'Recalled', quiz: { ...quiz, lastAnsweredAt: now - 15 * DAY } }, now)).toBe(true);
  });
});

describe('findWordInLine', () => {
  it('finds a whole word, ignoring case', () => {
    expect(findWordInLine('Mon amour, amoureux', 'amour')).toEqual({ start: 4, end: 9 });
    expect(findWordInLine('amoureux', 'amour')).toBeNull();
    expect(findWordInLine("L'amour", 'amour')).toEqual({ start: 2, end: 7 });
  });

  it('finds a word written without spaces', () => {
    expect(findWordInLine('君の名前を', '名前')).toEqual({ start: 2, end: 4 });
  });
});

describe('buildReviewItems', () => {
  const others = [word('chat', 'cat'), word('chien', 'dog'), word('maison', 'house')];

  it('asks a Seen word its meaning and blanks a Recognized word out of its line', () => {
    const seen = word('amour', 'love', {}, 'Mon amour');
    const recognized = word('cœur', 'heart', { masteryLevel: 'Recognized' }, 'Mon cœur bat');
    const items = buildReviewItems([seen, recognized], [seen, recognized, ...others]);
    expect(items.map((i) => [i.entry.word, i.kind])).toEqual([['amour', 'meaning'], ['cœur', 'lyric']]);
    expect(items[1]).toMatchObject({ line: 'Mon cœur bat', wordAt: { start: 4, end: 8 }, hint: 'translated cœur' });
    expect(items[1].quiz.options).toContain('cœur');
  });

  it('hints a lyric quiz with the meaning when the line lacks the word', () => {
    const recognized = word('cœur', 'heart', { masteryLevel: 'Recognized' }, 'Mon cœurs');
    const [item] = buildReviewItems([recognized], [recognized, ...others]);
    expect(item.wordAt).toBeUndefined();
    expect(item.hint).toBe('heart');
  });

  it('leaves out a word with no meaning or too few other words to quiz with', () => {
    const blank = word('rien', '');
    const lonely = { ...word('hola', 'hello'), language: 'es' };
    expect(buildReviewItems([blank, lonely], [blank, lonely, ...others])).toEqual([]);
  });

  it('only picks due words', () => {
    const known = word('oui', 'yes', { masteryLevel: 'Known' });
    expect(dueWords([known, ...others], now)).toEqual(others);
  });
});

describe('lineWords', () => {
  it('splits at apostrophes too', () => {
    expect(lineWords("Je veux de l'amour, de la joie")).toEqual(['Je', 'veux', 'de', 'l', 'amour', 'de', 'la', 'joie']);
  });
});
