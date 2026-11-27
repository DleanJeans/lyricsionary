import { languageKey } from '../constants/languages';
import type { MasteryLevel, WordEntry } from '../types';
import { isGermanLanguage } from './compoundWords';
import { shownDefinition, type PartOfSpeech } from './partOfSpeech';

/** Which quiz a level takes: the meaning quiz proves Recognized, the lyric quiz Recalled and Known */
export type QuizKind = 'meaning' | 'lyric';

export interface QuizStats {
  /** Points from correct answers in a row that count toward the next level (a picked answer is 1, typed without the IPA 2, said without the IPA 3) */
  streak: number;
  correct: number;
  wrong: number;
  lastAnsweredAt?: number;
  lastCorrectAt?: number;
  lastWrongAt?: number;
  /** The local day ("2026-10-25") of the last answer that counted toward the next level */
  lastCountedDay?: string;
}

export const QUIZ_RULES = {
  /** Points in a row, any day, to go from Seen to Recognized: 2 picked answers, or one typed without the IPA */
  toRecognized: 2,
  /** Points in a row, counting one answer a day, to go from Recognized to Recalled */
  toRecalled: 3,
  /** Days a Recalled word goes without a quiz before a correct answer makes it Known */
  knownAfterDays: 14,
  /** A word is quizzed once in this long, right or wrong, so its answers are spread out over the day */
  cooldownMs: 4 * 60 * 60 * 1000,
  options: 4,
};

/** A hinted answer stops this short of the points a level needs */
const HINT_CAP = 0.5;
const DAY_MS = 24 * 60 * 60 * 1000;

export const quizKindFor = (level?: MasteryLevel): QuizKind | null =>
  !level || level === 'Seen' ? 'meaning' : level === 'Known' ? null : 'lyric';

export const localDay = (time: number) => {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/** Whether the word was quizzed too recently to ask again */
export const isCoolingDown = (quiz: QuizStats | undefined, now: number) =>
  !!quiz?.lastAnsweredAt && now - quiz.lastAnsweredAt < QUIZ_RULES.cooldownMs;

/**
 * Whether a quiz now would count toward the word's next level: not quizzed in the last few hours,
 * a Recognized word not counted yet today, and a Recalled word not quizzed for 14 days
 */
export function isDue(entry: { masteryLevel?: MasteryLevel; quiz?: QuizStats }, now: number): boolean {
  const level = entry.masteryLevel ?? 'Seen';
  if (!quizKindFor(level) || isCoolingDown(entry.quiz, now)) return false;
  if (level === 'Recognized') return entry.quiz?.lastCountedDay !== localDay(now);
  if (level === 'Recalled') {
    const last = entry.quiz?.lastAnsweredAt;
    return last === undefined || now - last >= QUIZ_RULES.knownAfterDays * DAY_MS;
  }
  return true;
}

/** Days a wrong answer keeps a word on the Tricky list */
const TRICKY_DAYS = 7;

/** Whether the word was answered wrong in the last week, or its last answer was wrong */
export function isTricky(quiz: QuizStats | undefined, now: number): boolean {
  if (!quiz || quiz.wrong === 0 || quiz.lastAnsweredAt === undefined) return false;
  if (quiz.lastWrongAt !== undefined && now - quiz.lastWrongAt < TRICKY_DAYS * DAY_MS) return true;
  // Answered before lastWrongAt was kept: the last answer was wrong when it wasn't the last right one
  return quiz.lastCorrectAt !== quiz.lastAnsweredAt;
}

/**
 * Most missed first: the larger share of wrong answers, then more of them; words never answered
 * wrong keep their order after these
 */
export function compareMostMissed(a: QuizStats | undefined, b: QuizStats | undefined): number {
  const share = (q: QuizStats | undefined) => (q && q.wrong > 0 ? q.wrong / (q.wrong + q.correct) : 0);
  return share(b) - share(a) || (b?.wrong ?? 0) - (a?.wrong ?? 0);
}

/** When a quiz will next count toward the word's next level: now when due, null for a Known word */
export function nextDueAt(entry: { masteryLevel?: MasteryLevel; quiz?: QuizStats }, now: number): number | null {
  const level = entry.masteryLevel ?? 'Seen';
  if (!quizKindFor(level)) return null;
  if (isDue(entry, now)) return now;
  const last = entry.quiz?.lastAnsweredAt ?? now;
  let at = last + QUIZ_RULES.cooldownMs;
  if (level === 'Recognized' && entry.quiz?.lastCountedDay === localDay(now)) {
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    at = Math.max(at, tomorrow.getTime());
  }
  if (level === 'Recalled') at = Math.max(at, last + QUIZ_RULES.knownAfterDays * DAY_MS);
  return Math.max(at, now);
}

/** "Due now", "Due in 3 hours", "Due tomorrow" or "Due in 12 days", for the word card */
export function dueLabel(dueAt: number, now: number): string {
  const ms = dueAt - now;
  if (ms <= 0) return 'Due for a quiz now';
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours < 12) return `Next quiz in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const startOf = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const days = Math.round((startOf(dueAt) - startOf(now)) / DAY_MS);
  if (days <= 0) return `Next quiz in ${hours} hours`;
  if (days === 1) return 'Next quiz tomorrow';
  return `Next quiz in ${days} days`;
}

/** How many more correct answers the word needs for its next level, e.g. "2 more to Recognized" */
export function progressLabel(level: MasteryLevel | undefined, quiz: QuizStats | undefined): string | null {
  const streak = quiz?.streak ?? 0;
  switch (level ?? 'Seen') {
    case 'Seen':
      return `${QUIZ_RULES.toRecognized - Math.floor(streak)} more ${QUIZ_RULES.toRecognized - Math.floor(streak) === 1 ? 'point' : 'points'} to Recognized`;
    case 'Recognized':
      return `${QUIZ_RULES.toRecalled - Math.floor(streak)} more ${QUIZ_RULES.toRecalled - Math.floor(streak) === 1 ? 'point' : 'points'}, one answer a day, to Recalled`;
    case 'Recalled':
      return `Right again after ${QUIZ_RULES.knownAfterDays} days to make it Known`;
    default:
      return null;
  }
}

/** How far the word is toward its next level, 0 to 1. Recalled waits on days, not answers, so it shows none. */
export function levelProgress(level: MasteryLevel | undefined, quiz: QuizStats | undefined): number {
  const streak = quiz?.streak ?? 0;
  switch (level ?? 'Seen') {
    case 'Seen':
      return streak / QUIZ_RULES.toRecognized;
    case 'Recognized':
      return streak / QUIZ_RULES.toRecalled;
    default:
      return 0;
  }
}

/** What the progress bar can't show: Recognized counts one answer a day and Recalled waits on days */
export function progressHint(level: MasteryLevel | undefined, quiz: QuizStats | undefined, now: number): string | null {
  if (level === 'Recognized' && quiz?.lastCountedDay === localDay(now)) return 'The next one counts tomorrow';
  if (level === 'Recalled') return `Right again after ${QUIZ_RULES.knownAfterDays} days to make it Known`;
  return null;
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
  now: number,
  points = 1,
  hinted = false
): { masteryLevel: MasteryLevel; quiz: QuizStats } {
  const current = level ?? 'Seen';
  const before: QuizStats = quiz ?? { streak: 0, correct: 0, wrong: 0 };
  const answered: QuizStats = { ...before, lastAnsweredAt: now };
  if (!correct) {
    return { masteryLevel: current, quiz: { ...answered, streak: 0, wrong: before.wrong + 1, lastWrongAt: now } };
  }
  const right: QuizStats = { ...answered, correct: before.correct + 1, lastCorrectAt: now };
  const day = localDay(now);
  // A hinted answer (its points already lowered by the caller) can't be the one that makes a level
  const capped = (streak: number, needed: number) => (hinted ? Math.min(streak, needed - HINT_CAP) : streak);

  if (current === 'Seen' && kind === 'meaning') {
    const streak = capped(before.streak + points, QUIZ_RULES.toRecognized);
    return streak >= QUIZ_RULES.toRecognized
      ? { masteryLevel: 'Recognized', quiz: { ...right, streak: 0, lastCountedDay: undefined } }
      : { masteryLevel: current, quiz: { ...right, streak } };
  }
  if (current === 'Recognized' && kind === 'lyric') {
    // Only the first correct answer of a day counts
    if (before.lastCountedDay === day) return { masteryLevel: current, quiz: right };
    const streak = capped(before.streak + points, QUIZ_RULES.toRecalled);
    return streak >= QUIZ_RULES.toRecalled
      ? { masteryLevel: 'Recalled', quiz: { ...right, streak: 0, lastCountedDay: undefined } }
      : { masteryLevel: current, quiz: { ...right, streak, lastCountedDay: hinted ? before.lastCountedDay : day } };
  }
  if (current === 'Recalled' && kind === 'lyric') {
    const gap = before.lastAnsweredAt === undefined ? 0 : now - before.lastAnsweredAt;
    if (!hinted && gap >= QUIZ_RULES.knownAfterDays * DAY_MS) {
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

// A quiz compares its answer with every other saved word's meanings, and a review builds a quiz for
// every due word, so what's worked out from a meaning is kept, until there are too many to keep
function cached<T>(compute: (text: string) => T): (text: string) => T {
  const cache = new Map<string, T>();
  return (text) => {
    let value = cache.get(text);
    if (value === undefined) {
      if (cache.size > 20000) cache.clear();
      cache.set(text, (value = compute(text)));
    }
    return value;
  };
}

const contentWords = cached((text: string) =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}']+/u)
    .filter((word) => word && !FILLER_WORDS.has(word))
);

/** Whether two meanings share a content word, e.g. "heart" and "my heart", so both would be right */
export function meaningsOverlap(a: string, b: string): boolean {
  const words = new Set(contentWords(a));
  return contentWords(b).some((word) => words.has(word));
}

const similarLength = (a: string, b: string) =>
  Math.max(a.length, b.length) <= 2 * Math.max(1, Math.min(a.length, b.length));

const letters = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * How alike an option looks to the answer, so it can't be ruled out at a glance: the same number of
 * words ("to run" / "to go"), the same starting letter, ignoring a verb's "to" ("love" / "luck"), a
 * rhyme ("Herz" / "Schmerz") and a similar length
 */
export function lookAlikeScore(option: string, answer: string): number {
  const a = lookAlike(option);
  const b = lookAlike(answer);
  const sameCount = a.wordCount === b.wordCount;
  const sameStart = !!b.first && a.first === b.first;
  const rhymes = b.ending.length === 2 && a.ending === b.ending;
  return (sameCount ? 2 : 0) + (sameStart ? 1 : 0) + (rhymes ? 1 : 0) + (similarLength(option, answer) ? 1 : 0);
}

// What lookAlikeScore compares: the number of words, the first letter and the last two letters
const lookAlike = cached((text: string) => {
  const words = text.trim().split(/\s+/);
  return {
    wordCount: words.length,
    first: (contentWords(text)[0] ?? letters(text)).charAt(0),
    ending: letters(words[words.length - 1] ?? '').slice(-2),
  };
});

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
  const word = target.entry.word.toLowerCase();
  const language = languageKey(target.entry.language);
  return words.filter(
    (w) =>
      w.id !== target.entry.id &&
      w.word.toLowerCase() !== word &&
      !excluded.has(w.word.toLowerCase()) &&
      languageKey(w.language) === language
  );
};

/**
 * Whether the word was answered right earlier today. Its answer was just shown as the right one, so
 * as another quiz's wrong option it's easy to rule out; such options come last (ANSWERED_TODAY) and
 * are used only when there aren't enough others.
 */
export const answeredRightToday = (entry: WordEntry, today: string) =>
  !!entry.quiz?.lastCorrectAt && localDay(entry.quiz.lastCorrectAt) === today;

// Below every other score, so pickBest takes them only to fill the options up
const ANSWERED_TODAY = -100;

const finish = (answer: string, wrong: string[], random: () => number): Quiz | null => {
  // Fewer than 2 wrong options makes too easy a quiz
  if (wrong.length < 2) return null;
  const options = shuffle([answer, ...wrong], random);
  return { options, answerIndex: options.indexOf(answer) };
};

/**
 * A meaning quiz: the target's definition and the definitions of other saved words in its language,
 * preferring the same type of word, then meanings that look like it (lookAlikeScore), then words from
 * the same song. Words answered right earlier today are options only when there aren't enough others.
 */
export function buildMeaningQuiz(target: QuizTarget, words: WordEntry[], random = Math.random, now = Date.now()): Quiz | null {
  const today = localDay(now);
  const ownMeanings = [
    ...(target.entry.contexts ?? []).map((c) => c.definition),
    ...(target.entry.definitions ?? []).map((d) => d.text),
  ].filter((d): d is string => !!d?.trim());
  // A meaning sharing a content word with one of the word's own would be right too (meaningsOverlap)
  const ownWords = new Set(ownMeanings.flatMap(contentWords));
  // Options show verbs without their "to", e.g. "take" for "to take"
  const answer = shownDefinition(target.answer, target.partOfSpeech);
  const seen = new Set<string>([answer.toLowerCase()]);
  const candidates: { item: string; score: number }[] = [];
  for (const word of otherWords(target, words)) {
    const used = answeredRightToday(word, today) ? ANSWERED_TODAY : 0;
    const senses = [
      ...(word.contexts ?? []).map((c) => ({ text: c.definition, partOfSpeech: c.partOfSpeech })),
      ...(word.definitions ?? []).map((d) => ({ text: d.text, partOfSpeech: undefined })),
    ];
    for (const sense of senses) {
      const text = sense.text?.trim() && shownDefinition(sense.text.trim(), sense.partOfSpeech);
      if (!text || seen.has(text.toLowerCase())) continue;
      if (contentWords(text).some((w) => ownWords.has(w))) continue;
      seen.add(text.toLowerCase());
      const sameType = !!target.partOfSpeech && sense.partOfSpeech === target.partOfSpeech;
      candidates.push({
        item: text,
        score: used + (sameType ? 8 : 0) + lookAlikeScore(text, answer) + (fromSong(word, target.songId) ? 1 : 0),
      });
    }
  }
  return finish(answer, pickBest(candidates, QUIZ_RULES.options - 1, random), random);
}

const isCapitalized = (word: string) => word.charAt(0) !== word.charAt(0).toLowerCase();

/**
 * A lyric quiz: the target word and other saved words in its language to fill the lyric's gap with,
 * preferring the same type of word, then words that look like it (lookAlikeScore), then words from the
 * same song. In German only words capitalized like the answer are options, since a noun's capital
 * would give it away. Words answered right earlier today are options only when there aren't enough
 * others.
 */
export function buildLyricQuiz(target: QuizTarget, words: WordEntry[], random = Math.random, now = Date.now()): Quiz | null {
  const today = localDay(now);
  const answer = target.entry.word;
  const german = isGermanLanguage([target.entry.language]);
  const seen = new Set<string>([answer.toLowerCase()]);
  const candidates: { item: string; score: number }[] = [];
  for (const word of otherWords(target, words)) {
    if (seen.has(word.word.toLowerCase())) continue;
    if (german && isCapitalized(word.word) !== isCapitalized(answer)) continue;
    seen.add(word.word.toLowerCase());
    const sameType = !!target.partOfSpeech && (word.contexts ?? []).some((c) => c.partOfSpeech === target.partOfSpeech);
    candidates.push({
      item: word.word,
      score:
        (answeredRightToday(word, today) ? ANSWERED_TODAY : 0) +
        (sameType ? 8 : 0) +
        lookAlikeScore(word.word, answer) +
        (fromSong(word, target.songId) ? 2 : 0),
    });
  }
  return finish(answer, pickBest(candidates, QUIZ_RULES.options - 1, random), random);
}

const ACCENTED_SCRIPTS = /^[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{M}\s'-]+$/u;

const typedForm = (text: string) =>
  text
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .replace(/\s+/g, ' ')
    // Russian stress marks are a reading aid, not spelling
    .replace(/([Ѐ-ӿ])́/g, '$1');

const withoutAccents = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss');

/**
 * How a typed answer compares to the word: right, right but for its accents (still counted, e.g.
 * "corazon" for corazón), or wrong. Case and edge punctuation don't matter. Accents only fold in
 * Latin, Cyrillic and Greek words, since a kana's dakuten or a Hangul syllable isn't an accent.
 */
export function checkTypedAnswer(typed: string, answer: string, mustCapitalize = false): 'right' | 'accents' | 'capital' | 'wrong' {
  const a = typedForm(typed);
  const b = typedForm(answer);
  if (!a) return 'wrong';
  const close = a === b || (ACCENTED_SCRIPTS.test(b) && withoutAccents(a) === withoutAccents(b));
  // A German noun is written with a capital, so a lowercase try is wrong even when the letters match
  if (close && mustCapitalize) {
    const first = typed.trim().replace(/^[^\p{L}\p{N}]+/u, '').charAt(0);
    if (first !== first.toUpperCase() || first === first.toLowerCase()) return 'capital';
  }
  if (a === b) return 'right';
  return close ? 'accents' : 'wrong';
}

const spokenForm = (text: string) => withoutAccents(typedForm(text)).replace(/[^\p{L}\p{N}]+/gu, '');

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

/**
 * Whether what a speech recognizer heard counts as the word. Looser than typing, since a recognizer
 * can't hear capitals, accents, apostrophes or hyphens and often mishears a letter: any of its guesses
 * counts, spacing and punctuation are ignored (j'ai = jai = j ai), the word may sit among extra words
 * it heard, and a long enough word may be one letter off.
 */
export function checkSpokenAnswer(heardAlternatives: string[], answer: string): boolean {
  const target = spokenForm(answer);
  if (!target) return false;
  const allowed = target.length >= 10 ? 2 : target.length >= 4 ? 1 : 0;
  // Voiced and unvoiced pairs are easy to mishear (b/p, d/t, g/k), so they count as the same sound
  const soft = (t: string) => t.replace(/b/g, 'p').replace(/d/g, 't').replace(/g/g, 'k');
  const softTarget = soft(target);
  return heardAlternatives.some((heard) => {
    const forms = [spokenForm(heard), ...heard.split(/\s+/).map(spokenForm)].filter(Boolean);
    return forms.some(
      (f) =>
        f === target ||
        soft(f) === softTarget ||
        (allowed > 0 && Math.abs(f.length - target.length) <= allowed && editDistance(soft(f), softTarget) <= allowed)
    );
  });
}

/** The guess nearest the word, e.g. the one to show as "Heard" */
export function closestHeard(heardAlternatives: string[], answer: string): string {
  const target = spokenForm(answer);
  let best = heardAlternatives[0] ?? '';
  let bestDistance = Infinity;
  for (const heard of heardAlternatives) {
    for (const part of [heard, ...heard.split(/\s+/)]) {
      const f = spokenForm(part);
      if (!f) continue;
      const d = editDistance(f, target);
      if (d < bestDistance) {
        bestDistance = d;
        best = part.trim();
      }
    }
  }
  return best;
}

/**
 * Marks which letters of the word and of what was heard line up, by the longest run of letters they
 * share in order (case, accents and punctuation ignored). Symbols are kept as they were written.
 */
export function alignSpoken(heard: string, answer: string): { heard: { char: string; hit: boolean }[]; word: { char: string; hit: boolean }[] } {
  const fold = (c: string) => withoutAccents(c.toLowerCase());
  const letters = (text: string) => Array.from(text).map((char) => ({ char, key: /[\p{L}\p{N}]/u.test(char) ? fold(char) : '' }));
  const a = letters(heard);
  const b = letters(answer);
  const ai = a.filter((x) => x.key);
  const bi = b.filter((x) => x.key);
  const dp = Array.from({ length: ai.length + 1 }, () => new Array<number>(bi.length + 1).fill(0));
  for (let i = ai.length - 1; i >= 0; i--)
    for (let j = bi.length - 1; j >= 0; j--) dp[i][j] = ai[i].key === bi[j].key ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hitA = new Set<object>();
  const hitB = new Set<object>();
  let i = 0;
  let j = 0;
  while (i < ai.length && j < bi.length) {
    if (ai[i].key === bi[j].key) {
      hitA.add(ai[i++]);
      hitB.add(bi[j++]);
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return {
    heard: a.map((x) => ({ char: x.char, hit: hitA.has(x) })),
    word: b.map((x) => ({ char: x.char, hit: !x.key || hitB.has(x) })),
  };
}

/** Whether a typed answer must start with a capital: a German noun, or when its type is unknown a word saved capitalized */
export function mustCapitalize(entry: { word: string; language: string; contexts: { partOfSpeech?: string }[] }): boolean {
  if (!isGermanLanguage([entry.language])) return false;
  const types = entry.contexts.map((c) => c.partOfSpeech).filter(Boolean);
  if (types.length) return types.includes('noun');
  return /^\p{Lu}/u.test(entry.word.trim());
}

/** A Recalled word's lyric quiz is typed, since picking it out of a few is what Recognized proved */
export const isTypedQuiz = (level: MasteryLevel | undefined, kind: QuizKind) => kind === 'lyric' && level === 'Recalled';

/** Points a right answer is worth: picked 1, typed from the meaning or line (no IPA given) 2, said out loud (no IPA given) 3 */
export const answerPoints = (how: 'picked' | 'typed' | 'spoken') => (how === 'spoken' ? 3 : how === 'typed' ? 2 : 1);
