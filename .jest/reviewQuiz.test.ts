import type { WordEntry } from '../src/types';
import { buildLaunchReview, buildReviewItems, dueWords, findWordInLine, lineWords, pickReviewItems } from '../src/utils/reviewQuiz';
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

describe('pickReviewItems', () => {
  it('takes the first ones and shuffles them', () => {
    const items = ['a', 'b', 'c', 'd'].map((w) => ({ entry: word(w, w) }) as unknown as import('../src/utils/reviewQuiz').ReviewItem);
    const picked = pickReviewItems(items, 3, () => 0);
    expect(picked.map((i) => i.entry.word).sort()).toEqual(['a', 'b', 'c']);
    expect(picked.map((i) => i.entry.word)).not.toEqual(['a', 'b', 'c']);
  });
});

describe('listening quiz', () => {
  const others = [word('chat', 'cat'), word('chien', 'dog'), word('maison', 'house')];
  const audio = [{ title: 'Fr-cœur.ogg', url: 'https://x/Fr-cœur.ogg', label: '' }];

  it('sometimes asks a word with a recording by ear', () => {
    const recognized = word('cœur', 'heart', { masteryLevel: 'Recognized', audio }, 'Mon cœur bat');
    expect(buildReviewItems([recognized], [recognized, ...others], () => 0.1)[0].listen).toBe(true);
    expect(buildReviewItems([recognized], [recognized, ...others], () => 0.9)[0].listen).toBe(false);
  });

  it('always asks by ear when the line lacks the word, and never for a meaning quiz', () => {
    const lineless = word('cœur', 'heart', { masteryLevel: 'Recognized', audio });
    expect(buildReviewItems([lineless], [lineless, ...others], () => 0.9)[0].listen).toBe(true);
    const seen = word('cœur', 'heart', { audio });
    expect(buildReviewItems([seen], [seen, ...others], () => 0.1)[0].listen).toBe(false);
  });
});

describe('buildLaunchReview', () => {
  const inSong = (text: string, songId: string): WordEntry => {
    const entry = word(text, `${text}ish`);
    return { ...entry, contexts: entry.contexts!.map((c) => ({ ...c, songId })) };
  };
  const songs = [
    { id: 'old', lastOpenedAt: 1 },
    { id: 'last', lastOpenedAt: 3 },
    { id: 'archived', lastOpenedAt: 4, archivedAt: 4 },
    { id: 'middle', lastOpenedAt: 2 },
  ];

  it('takes the last song first, then tops up from the ones opened before it', () => {
    const words = [
      ...Array.from({ length: 4 }, (_, i) => inSong(`last${i}`, 'last')),
      ...Array.from({ length: 3 }, (_, i) => inSong(`archived${i}`, 'archived')),
      ...Array.from({ length: 4 }, (_, i) => inSong(`middle${i}`, 'middle')),
      ...Array.from({ length: 4 }, (_, i) => inSong(`old${i}`, 'old')),
    ];
    const picked = buildLaunchReview(songs, words, now, 10).map((item) => item.entry.word);
    expect(picked).toHaveLength(10);
    expect(picked.filter((w) => w.startsWith('last'))).toHaveLength(4);
    expect(picked.filter((w) => w.startsWith('middle'))).toHaveLength(4);
    expect(picked.filter((w) => w.startsWith('old'))).toHaveLength(2);
    expect(picked.some((w) => w.startsWith('archived'))).toBe(false);
  });

  it('skips to an older song when the last one has nothing due, and is empty when none has', () => {
    const known = { ...inSong('known', 'last'), masteryLevel: 'Known' as const };
    const words = [known, ...Array.from({ length: 4 }, (_, i) => inSong(`old${i}`, 'old'))];
    expect(buildLaunchReview(songs, words, now, 10).map((item) => item.entry.word).sort()).toEqual([
      'old0',
      'old1',
      'old2',
      'old3',
    ]);
    expect(buildLaunchReview(songs, [known], now, 10)).toEqual([]);
  });
});
