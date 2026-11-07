import type { WordContext, WordEntry } from '../types';
import { removeSpecialChars } from './cleanLyrics';
import { isCjkWord } from './cjkWords';
import { buildLyricQuiz, buildMeaningQuiz, isDue, isTricky, Quiz, QuizKind, quizKindFor } from './wordQuiz';

export interface ReviewItem {
  entry: WordEntry;
  kind: QuizKind;
  quiz: Quiz;
  /** The lyric line the word was saved from, if it has one */
  line?: string;
  /** Where the word is in the line, to bold it or blank it out */
  wordAt?: { start: number; end: number };
  /** The line's translation, or the word's meaning when the line has none, to fill the gap from */
  hint?: string;
  /** Asked from the word's recording instead of its line: "Which word did you hear?" */
  listen?: boolean;
}

/** The line's words, also split at apostrophes, e.g. amour in l'amour */
export const lineWords = (line: string) =>
  line.split(/[\s'’]+/).map(removeSpecialChars).filter(Boolean);

const isLetter = (char: string | undefined) => !!char && /[\p{L}\p{N}]/u.test(char);

/** Where the word is in the line, ignoring case, as a whole word unless it's written without spaces */
export function findWordInLine(line: string, word: string): { start: number; end: number } | null {
  const lowerLine = line.toLowerCase();
  const lowerWord = word.toLowerCase();
  const wholeWord = !isCjkWord(word);
  for (let start = lowerLine.indexOf(lowerWord); start !== -1; start = lowerLine.indexOf(lowerWord, start + 1)) {
    const end = start + lowerWord.length;
    if (!wholeWord || (!isLetter(line[start - 1]) && !isLetter(line[end]))) return { start, end };
  }
  return null;
}

// The context to ask about: the first with a lyric line and a meaning, otherwise the first with a meaning
const pickContext = (entry: WordEntry): WordContext | undefined => {
  const contexts = entry.contexts ?? [];
  return (
    contexts.find((c) => c.definition?.trim() && c.context?.trim() && findWordInLine(c.context, entry.word)) ??
    contexts.find((c) => c.definition?.trim())
  );
};

// The meaning a word's quiz asks for, from the context it's asked about
const answerFor = (entry: WordEntry, context: WordContext | undefined) =>
  context?.definition?.trim() || entry.definitions?.find((d) => d.text.trim())?.text.trim();

/**
 * Whether a due word can be reviewed: its level has a quiz and it has a meaning to ask for. Cheap,
 * for counting a song's due words without building their quizzes, which compare every saved word.
 */
export const canReview = (entry: WordEntry) => !!quizKindFor(entry.masteryLevel) && !!answerFor(entry, pickContext(entry));

/**
 * A quiz for each word that's due (isDue), tricky ones (isTricky) first, then the ones not quizzed
 * for longest. A word whose quiz
 * can't be made, e.g. one with no meaning or too few other saved words in its language, is left out.
 */
export function buildReviewItems(dueWords: WordEntry[], words: WordEntry[], random = Math.random): ReviewItem[] {
  const items: ReviewItem[] = [];
  // Tricky words first, then the ones not quizzed for longest
  const now = Date.now();
  const ordered = [...dueWords].sort(
    (a, b) =>
      Number(isTricky(b.quiz, now)) - Number(isTricky(a.quiz, now)) ||
      (a.quiz?.lastAnsweredAt ?? 0) - (b.quiz?.lastAnsweredAt ?? 0)
  );
  for (const entry of ordered) {
    const kind = quizKindFor(entry.masteryLevel);
    if (!kind) continue;
    const context = pickContext(entry);
    const answer = answerFor(entry, context);
    if (!answer) continue;
    const line = context?.context?.trim() || undefined;
    const wordAt = line ? findWordInLine(line, entry.word) ?? undefined : undefined;
    const target = { entry, answer, partOfSpeech: context?.partOfSpeech, songId: context?.songId };
    const quiz =
      kind === 'meaning'
        ? buildMeaningQuiz(target, words, random)
        : buildLyricQuiz(
            {
              ...target,
              // Words the line shows can't be what's missing from it
              excludeWords: wordAt && line ? [...line.split(/\s+/).map(removeSpecialChars), ...lineWords(line)] : undefined,
            },
            words,
            random
          );
    if (!quiz) continue;
    // A word with a recording is sometimes heard instead of read, and always when its line lacks it
    const listen = kind === 'lyric' && !!entry.audio?.length && (!wordAt || random() < 0.5);
    items.push({
      listen,
      entry,
      kind,
      quiz,
      line,
      wordAt,
      hint: kind === 'lyric' ? (wordAt && context?.translation?.trim()) || answer : undefined,
    });
  }
  return items;
}

export const dueWords = (words: WordEntry[], now: number) => words.filter((w) => isDue(w, now));

/** Review session sizes to pick from when more words are due than the smallest */
export const REVIEW_SIZES = [10, 20];

/**
 * The words for a session of `size`: the ones waiting longest (buildReviewItems' order), shuffled
 * so one language's words don't all come in a row
 */
export function pickReviewItems(items: ReviewItem[], size: number, random = Math.random): ReviewItem[] {
  const picked = items.slice(0, size);
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return picked;
}

/** How many words the review shown when the app opens asks */
export const LAUNCH_REVIEW_SIZE = 10;

/**
 * The review to show when the app opens: due words from the song opened last, topped up from the
 * one opened before it and so on until there are `size`. Archived songs are skipped. Each song's
 * words keep buildReviewItems' order, tricky ones and the ones waiting longest first; the session
 * shuffles them.
 */
export function buildLaunchReview(
  songs: { id: string; lastOpenedAt?: number; archivedAt?: number }[],
  words: WordEntry[],
  now = Date.now(),
  size = LAUNCH_REVIEW_SIZE,
  random = Math.random
): ReviewItem[] {
  const due = dueWords(words, now).filter(canReview);
  if (!due.length) return [];
  const recent = songs.filter((s) => !s.archivedAt).sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0));
  const picked: ReviewItem[] = [];
  const taken = new Set<string>();
  for (const song of recent) {
    if (picked.length >= size) break;
    const songDue = due.filter((w) => !taken.has(w.id) && w.contexts?.some((c) => c.songId === song.id));
    if (!songDue.length) continue;
    for (const item of buildReviewItems(songDue, words, random)) {
      if (picked.length >= size) break;
      picked.push(item);
      taken.add(item.entry.id);
    }
  }
  return picked;
}
