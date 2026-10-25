import { isSameLanguage } from '../constants/languages';
import type { MasteryLevel, WordEntry } from '../types';
import type { PartOfSpeech } from './partOfSpeech';

/** Which quiz a level takes: the meaning quiz proves Recognized, the lyric quiz Recalled and Known */
export type QuizKind = 'meaning' | 'lyric';

export interface QuizStats {
  /** Correct answers in a row that count toward the next level */
  streak: number;
  correct: number;
  wrong: number;
  lastAnsweredAt?: number;
  lastCorrectAt?: number;
  /** The local day ("2026-10-25") of the last answer that counted toward the next level */
  lastCountedDay?: string;
}

export const QUIZ_RULES = {
  /** Meaning quiz answers in a row, any day, to go from Seen to Recognized */
  toRecognized: 3,
  /** Lyric quiz answers in a row, each on another day, to go from Recognized to Recalled */
  toRecalled: 3,
  /** Days a Recalled word goes without a quiz before a correct answer makes it Known */
  knownAfterDays: 14,
  /** A word answered correctly isn't asked again this soon, e.g. when it repeats in the chorus */
  cooldownMs: 10 * 60 * 1000,
  options: 4,
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const quizKindFor = (level?: MasteryLevel): QuizKind | null =>
  !level || level === 'Seen' ? 'meaning' : level === 'Known' ? null : 'lyric';

const localDay = (time: number) => {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/** Whether the word was answered correctly too recently to ask again */
export const isCoolingDown = (quiz: QuizStats | undefined, now: number) =>
  !!quiz?.lastCorrectAt && now - quiz.lastCorrectAt < QUIZ_RULES.cooldownMs;

/** How many more correct answers the word needs for its next level, e.g. "2 more to Recognized" */
export function progressLabel(level: MasteryLevel | undefined, quiz: QuizStats | undefined): string | null {
  const streak = quiz?.streak ?? 0;
  switch (level ?? 'Seen') {
    case 'Seen':
      return `${QUIZ_RULES.toRecognized - streak} more to Recognized`;
    case 'Recognized':
      return `${QUIZ_RULES.toRecalled - streak} more, on different days, to Recalled`;
    case 'Recalled':
      return `Right again after ${QUIZ_RULES.knownAfterDays} days to make it Known`;
    default:
      return null;
  }
}

/**
 * The word's quiz stats and level after an answer. A wrong answer starts the streak again but never
 * lowers the level; moving up a level starts the streak for the next one.
 */
export function recordAnswer(
  level: MasteryLevel | undefined,
  quiz: QuizStats | undefined,
  kind: QuizKind,
  correct: boolean,
  now: number
): { masteryLevel: MasteryLevel; quiz: QuizStats } {
  const current = level ?? 'Seen';
  const before: QuizStats = quiz ?? { streak: 0, correct: 0, wrong: 0 };
  const answered: QuizStats = { ...before, lastAnsweredAt: now };
  if (!correct) {
    return { masteryLevel: current, quiz: { ...answered, streak: 0, wrong: before.wrong + 1 } };
  }
  const right: QuizStats = { ...answered, correct: before.correct + 1, lastCorrectAt: now };
  const day = localDay(now);

  if (current === 'Seen' && kind === 'meaning') {
    const streak = before.streak + 1;
    return streak >= QUIZ_RULES.toRecognized
      ? { masteryLevel: 'Recognized', quiz: { ...right, streak: 0, lastCountedDay: undefined } }
      : { masteryLevel: current, quiz: { ...right, streak } };
  }
  if (current === 'Recognized' && kind === 'lyric') {
    // Only the first correct answer of a day counts
    if (before.lastCountedDay === day) return { masteryLevel: current, quiz: right };
    const streak = before.streak + 1;
    return streak >= QUIZ_RULES.toRecalled
      ? { masteryLevel: 'Recalled', quiz: { ...right, streak: 0, lastCountedDay: undefined } }
      : { masteryLevel: current, quiz: { ...right, streak, lastCountedDay: day } };
  }
  if (current === 'Recalled' && kind === 'lyric') {
    const gap = before.lastAnsweredAt === undefined ? 0 : now - before.lastAnsweredAt;
    if (gap >= QUIZ_RULES.knownAfterDays * DAY_MS) {
      return { masteryLevel: 'Known', quiz: { ...right, streak: 0 } };
    }
  }
  // Practice that doesn't count toward a level, e.g. a lyric quiz on a Recalled word answered too soon
  return { masteryLevel: current, quiz: right };
}

// Small words two meanings can share without meaning the same, e.g. "to" in "to go" and "to run"
const FILLER_WORDS = new Set([
  'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'for', 'and', 'or', 'my', 'your', 'his', 'her', 'its',
  'our', 'their', 'be', 'is', 'it', 'one', 'oneself', 'someone', 'something', 'with', 'by', 'from', 'up',
]);

const contentWords = (text: string) =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}']+/u)
    .filter((word) => word && !FILLER_WORDS.has(word));

/** Whether two meanings share a content word, e.g. "heart" and "my heart", so both would be right */
export function meaningsOverlap(a: string, b: string): boolean {
  const words = new Set(contentWords(a));
  return contentWords(b).some((word) => words.has(word));
}

const similarLength = (a: string, b: string) =>
  Math.max(a.length, b.length) <= 2 * Math.max(1, Math.min(a.length, b.length));

const shuffle = <T>(items: T[], random: () => number): T[] => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// The best scored, at random among equal scores so the same ones don't always come up
function pickBest<T>(candidates: { item: T; score: number }[], count: number, random: () => number): T[] {
  return shuffle(candidates, random)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((c) => c.item);
}

export interface QuizTarget {
  entry: WordEntry;
  /** The definition being asked about, e.g. the one saved for this lyric line */
  answer: string;
  partOfSpeech?: PartOfSpeech;
  songId?: string;
  /** Words that can't be wrong answers, e.g. the parts of a German compound */
  excludeWords?: string[];
}

export interface Quiz {
  options: string[];
  answerIndex: number;
}

const fromSong = (entry: WordEntry, songId?: string) =>
  !!songId && (entry.contexts ?? []).some((c) => c.songId === songId);

const otherWords = (target: QuizTarget, words: WordEntry[]) => {
  const excluded = new Set((target.excludeWords ?? []).map((w) => w.toLowerCase()));
  return words.filter(
    (w) =>
      w.id !== target.entry.id &&
      w.word.toLowerCase() !== target.entry.word.toLowerCase() &&
      !excluded.has(w.word.toLowerCase()) &&
      isSameLanguage(w.language, target.entry.language)
  );
};

const finish = (answer: string, wrong: string[], random: () => number): Quiz | null => {
  // Fewer than 2 wrong options makes too easy a quiz
  if (wrong.length < 2) return null;
  const options = shuffle([answer, ...wrong], random);
  return { options, answerIndex: options.indexOf(answer) };
};

/**
 * A meaning quiz: the target's definition and the definitions of other saved words in its language,
 * preferring the same type of word, words from the same song and meanings of similar length
 */
export function buildMeaningQuiz(target: QuizTarget, words: WordEntry[], random = Math.random): Quiz | null {
  const ownMeanings = [
    ...(target.entry.contexts ?? []).map((c) => c.definition),
    ...(target.entry.definitions ?? []).map((d) => d.text),
  ].filter((d): d is string => !!d?.trim());
  const seen = new Set<string>([target.answer.toLowerCase()]);
  const candidates: { item: string; score: number }[] = [];
  for (const word of otherWords(target, words)) {
    const senses = [
      ...(word.contexts ?? []).map((c) => ({ text: c.definition, partOfSpeech: c.partOfSpeech })),
      ...(word.definitions ?? []).map((d) => ({ text: d.text, partOfSpeech: undefined })),
    ];
    for (const sense of senses) {
      const text = sense.text?.trim();
      if (!text || seen.has(text.toLowerCase())) continue;
      if (ownMeanings.some((meaning) => meaningsOverlap(meaning, text))) continue;
      seen.add(text.toLowerCase());
      const sameType = !!target.partOfSpeech && sense.partOfSpeech === target.partOfSpeech;
      candidates.push({
        item: text,
        score: (sameType ? 4 : 0) + (fromSong(word, target.songId) ? 2 : 0) + (similarLength(text, target.answer) ? 1 : 0),
      });
    }
  }
  return finish(target.answer, pickBest(candidates, QUIZ_RULES.options - 1, random), random);
}

/**
 * A lyric quiz: the target word and other saved words in its language to fill the lyric's gap with,
 * preferring words from the same song, the same type of word and words of similar length
 */
export function buildLyricQuiz(target: QuizTarget, words: WordEntry[], random = Math.random): Quiz | null {
  const answer = target.entry.word;
  const seen = new Set<string>([answer.toLowerCase()]);
  const candidates: { item: string; score: number }[] = [];
  for (const word of otherWords(target, words)) {
    if (seen.has(word.word.toLowerCase())) continue;
    seen.add(word.word.toLowerCase());
    const sameType = !!target.partOfSpeech && (word.contexts ?? []).some((c) => c.partOfSpeech === target.partOfSpeech);
    candidates.push({
      item: word.word,
      score: (fromSong(word, target.songId) ? 4 : 0) + (sameType ? 2 : 0) + (similarLength(word.word, answer) ? 1 : 0),
    });
  }
  return finish(answer, pickBest(candidates, QUIZ_RULES.options - 1, random), random);
}
