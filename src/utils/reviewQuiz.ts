import type { WordContext, WordEntry } from '../types';
import { removeSpecialChars } from './cleanLyrics';
import { isCjkWord } from './cjkWords';
import { buildLyricQuiz, buildMeaningQuiz, isDue, Quiz, QuizKind, quizKindFor } from './wordQuiz';

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

/**
 * A quiz for each word that's due (isDue), the ones not quizzed for longest first. A word whose quiz
 * can't be made, e.g. one with no meaning or too few other saved words in its language, is left out.
 */
export function buildReviewItems(dueWords: WordEntry[], words: WordEntry[], random = Math.random): ReviewItem[] {
  const items: ReviewItem[] = [];
  const ordered = [...dueWords].sort((a, b) => (a.quiz?.lastAnsweredAt ?? 0) - (b.quiz?.lastAnsweredAt ?? 0));
  for (const entry of ordered) {
    const kind = quizKindFor(entry.masteryLevel);
    if (!kind) continue;
    const context = pickContext(entry);
    const answer = context?.definition?.trim() || entry.definitions?.find((d) => d.text.trim())?.text.trim();
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
    items.push({
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
