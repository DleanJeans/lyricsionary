import { MASTERY_LEVELS, type WordContext, type WordEntry } from '../types';
import type { QuizStats } from './wordQuiz';
import { isSameLanguage } from '../constants/languages';

/** How a saved word is written: as saved, then the forms merged into it, e.g. vouloir, veux, voulez */
export const spellingsOf = (entry: WordEntry): string[] => [entry.word, ...(entry.forms ?? [])];

/** Whether a word is the saved word or one of its merged forms, ignoring case */
export const hasSpelling = (entry: WordEntry, word: string | undefined): boolean => {
  if (!word) return false;
  const lower = word.toLowerCase();
  return spellingsOf(entry).some((spelling) => spelling.toLowerCase() === lower);
};

/** The saved word in a language that a word is, as saved or as a merged form; the saved spelling wins */
export const findSavedWord = (words: WordEntry[], word: string | undefined, language: string): WordEntry | undefined => {
  if (!word) return undefined;
  const lower = word.toLowerCase();
  const inLanguage = words.filter((w) => isSameLanguage(w.language, language));
  return inLanguage.find((w) => w.word.toLowerCase() === lower) ?? inLanguage.find((w) => hasSpelling(w, word));
};

/** Other saved words in the same language that could be merged into this one */
export const mergeCandidates = (words: WordEntry[], entry: WordEntry): WordEntry[] =>
  words
    .filter((w) => w.id !== entry.id && isSameLanguage(w.language, entry.language))
    .sort((a, b) => a.word.localeCompare(b.word));

const levelIndex = (entry: WordEntry) => MASTERY_LEVELS.indexOf(entry.masteryLevel ?? 'Seen');
const latest = (...times: (number | undefined)[]) => {
  const known = times.filter((t): t is number => t !== undefined);
  return known.length ? Math.max(...known) : undefined;
};
const contextKey = (c: WordContext) => [c.context, c.songId ?? '', c.occurrence ?? 1, c.definition ?? ''].join('\u0000');

function mergeQuiz(ahead: QuizStats | undefined, behind: QuizStats | undefined): QuizStats | undefined {
  if (!ahead && !behind) return undefined;
  const a = ahead ?? { streak: 0, correct: 0, wrong: 0 };
  const b = behind ?? { streak: 0, correct: 0, wrong: 0 };
  return {
    // The streak toward the next level belongs to the level the word keeps
    streak: a.streak,
    lastCountedDay: a.lastCountedDay,
    correct: a.correct + b.correct,
    wrong: a.wrong + b.wrong,
    lastAnsweredAt: latest(a.lastAnsweredAt, b.lastAnsweredAt),
    lastCorrectAt: latest(a.lastCorrectAt, b.lastCorrectAt),
    lastWrongAt: latest(a.lastWrongAt, b.lastWrongAt),
  };
}

/**
 * One word from two forms saved apart, e.g. voulez into veux: it keeps every context, definition and
 * quiz answer, the higher level, and the merged word's spellings as forms
 */
export function mergeWordEntries(keep: WordEntry, from: WordEntry): WordEntry {
  const ahead = levelIndex(from) > levelIndex(keep) ? from : keep;
  const behind = ahead === keep ? from : keep;
  const seen = new Set(keep.contexts.map(contextKey));
  const contexts = [...keep.contexts, ...from.contexts.filter((c) => !seen.has(contextKey(c)))];
  const definitions = [...(keep.definitions ?? []), ...(from.definitions ?? [])];
  const forms = [...new Set([...(keep.forms ?? []), ...spellingsOf(from)])].filter(
    (form) => form.toLowerCase() !== keep.word.toLowerCase()
  );
  const notes = [keep.note, from.note].filter(Boolean);
  return {
    ...keep,
    contexts,
    forms,
    pronunciation: keep.pronunciation || from.pronunciation,
    emoji: keep.emoji ?? from.emoji,
    note: notes.length ? [...new Set(notes)].join('\n') : undefined,
    definitions: definitions.length ? definitions : undefined,
    audio: keep.audio?.length ? keep.audio : from.audio ?? keep.audio,
    masteryLevel: ahead.masteryLevel ?? 'Seen',
    quiz: mergeQuiz(ahead.quiz, behind.quiz),
    savedAt: keep.savedAt !== undefined && from.savedAt !== undefined ? Math.min(keep.savedAt, from.savedAt) : keep.savedAt ?? from.savedAt,
    lastLookedUp: Math.max(keep.lastLookedUp, from.lastLookedUp),
  };
}
