import type { WordEntry } from '../src/types';
import { lineWordsAt, pickLineQuiz, stepQuizLine } from '../src/utils/lineQuiz';

const HOUR = 60 * 60 * 1000;
const now = new Date(2026, 10, 13, 12).getTime();

let nextId = 0;
const word = (text: string, definition: string, extra: Partial<WordEntry> = {}): WordEntry => ({
  id: String(++nextId),
  word: text,
  language: 'fr',
  pronunciation: '',
  contexts: [{ context: '', definition, songId: 's1' }],
  lastLookedUp: 0,
  ...extra,
});

const others = [word('chat', 'cat'), word('chien', 'dog'), word('maison', 'house'), word('soleil', 'sun')];
const finder = (entries: WordEntry[]) => (w: string) => entries.find((e) => e.word.toLowerCase() === w.toLowerCase());
// Never picks the whole line, IPA, or a recording
const noLuck = () => 0.99;

describe('lineWordsAt', () => {
  it('finds each word with where its letters are, without punctuation', () => {
    expect(lineWordsAt('Mon amour, (oui)', () => false)).toEqual([
      { text: 'Mon', start: 0, end: 3 },
      { text: 'amour', start: 4, end: 9 },
      { text: 'oui', start: 12, end: 15 },
    ]);
  });
});

describe('pickLineQuiz', () => {
  it("asks a Seen word's meaning, and blanks a Recognized word out of the line", () => {
    const amour = word('amour', 'love');
    const seen = pickLineQuiz({ line: 'Mon amour', lineIndex: 0, songId: 's1', findEntry: finder([amour]), words: [amour, ...others], random: noLuck, now });
    expect(seen).toMatchObject({ mode: 'meaning', kind: 'meaning', practice: false, wordAt: { start: 4, end: 9 } });
    expect(seen!.quiz!.options[seen!.quiz!.answerIndex]).toBe('love');

    const known = { ...amour, masteryLevel: 'Recognized' as const };
    const gap = pickLineQuiz({ line: 'Mon amour', lineIndex: 0, songId: 's1', findEntry: finder([known]), words: [known, ...others], random: noLuck, now });
    expect(gap).toMatchObject({ mode: 'gap', kind: 'lyric', practice: false });
    expect(gap!.quiz!.options[gap!.quiz!.answerIndex]).toBe('amour');
  });

  it('asks a word whose answer would count before one quizzed in the last few hours', () => {
    const recent = word('amour', 'love', { quiz: { streak: 1, correct: 1, wrong: 0, lastAnsweredAt: now - HOUR } });
    const due = word('toujours', 'always');
    const item = pickLineQuiz({ line: 'amour toujours', lineIndex: 0, songId: 's1', findEntry: finder([recent, due]), words: [recent, due, ...others], random: noLuck, now });
    expect(item!.entry!.word).toBe('toujours');
  });

  it("practices a Known word without saving, and a word quizzed lately", () => {
    const known = word('amour', 'love', { masteryLevel: 'Known' });
    const item = pickLineQuiz({ line: 'Mon amour', lineIndex: 0, songId: 's1', findEntry: finder([known]), words: [known, ...others], random: noLuck, now });
    expect(item).toMatchObject({ mode: 'gap', practice: true });
  });

  it('asks another word of a repeated line than the one asked last time', () => {
    const a = word('amour', 'love');
    const b = word('toujours', 'always');
    const opts = { line: 'amour toujours', lineIndex: 0, songId: 's1', findEntry: finder([a, b]), words: [a, b, ...others], random: noLuck, now };
    const first = pickLineQuiz(opts)!.entry!.id;
    const second = pickLineQuiz({ ...opts, asked: new Set([first]) })!.entry!.id;
    expect(second).not.toBe(first);
  });

  it('spells a word from its IPA now and then', () => {
    const amour = word('amour', 'love', { masteryLevel: 'Recognized', pronunciation: '/a.muʁ/' });
    const item = pickLineQuiz({ line: 'Mon amour', lineIndex: 0, songId: 's1', findEntry: finder([amour]), words: [amour], random: () => 0.2, now });
    expect(item).toMatchObject({ mode: 'spell', ipa: 'a.muʁ' });
  });

  it('rebuilds a line with no saved words, and asks nothing of a short one', () => {
    expect(pickLineQuiz({ line: 'la la la', lineIndex: 0, findEntry: () => undefined, words: [], now })).toMatchObject({ mode: 'drill' });
    expect(pickLineQuiz({ line: 'Oh', lineIndex: 0, findEntry: () => undefined, words: [], now })).toBeNull();
    expect(pickLineQuiz({ line: 'Oh', lineIndex: 0, findEntry: () => undefined, words: [], canDictate: true, now })).toMatchObject({ mode: 'dictation' });
  });
});

describe('stepQuizLine', () => {
  it('goes on to the next line with lyrics, back to the first after the last', () => {
    expect(stepQuizLine([0, 1, 3], 1, 1)).toBe(3);
    expect(stepQuizLine([0, 1, 3], 3, 1)).toBe(0);
    expect(stepQuizLine([0, 1, 3], 0, -1)).toBe(3);
    expect(stepQuizLine([0, 1, 3], 2, 1)).toBe(3);
  });
});
