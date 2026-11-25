import { MASTERY_LEVELS, type WordContext, type WordEntry } from '../types';
import type { QuizStats } from './wordQuiz';
import { mergeHistories } from './wordHistory';
import { findWordSpots } from './wordLines';
import { isSameLanguage } from '../constants/languages';

/** How a saved word is written: as saved, then the forms merged into it, e.g. vouloir, veux, voulez */
export const spellingsOf = (entry: WordEntry): string[] => [entry.word, ...(entry.forms ?? [])];

/** Whether a word is the saved word or one of its merged forms, ignoring case */
export const hasSpelling = (entry: WordEntry, word: string | undefined): boolean => {
  if (!word) return false;
  const lower = word.toLowerCase();
  return spellingsOf(entry).some((spelling) => spelling.toLowerCase() === lower);
};

/** The IPA a merged form keeps of its own, e.g. voulez for vouloir; none for the saved spelling itself */
export const formIpa = (entry: WordEntry, spelling: string | undefined): string | undefined => {
  if (!spelling || !entry.formIpas) return undefined;
  const lower = spelling.toLowerCase();
  if (entry.word.toLowerCase() === lower) return undefined;
  const key = Object.keys(entry.formIpas).find((k) => k.toLowerCase() === lower);
  return key ? entry.formIpas[key] || undefined : undefined;
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
  // Each merged word's own IPA stays with its spelling instead of being dropped for the kept word's
  const formIpas: Record<string, string> = { ...(from.formIpas ?? {}), ...(keep.formIpas ?? {}) };
  if (from.pronunciation?.trim() && from.pronunciation.trim() !== keep.pronunciation?.trim()) {
    formIpas[from.word] = from.pronunciation.trim();
  }
  for (const key of Object.keys(formIpas)) if (key.toLowerCase() === keep.word.toLowerCase()) delete formIpas[key];
  const notes = [keep.note, from.note].filter(Boolean);
  return {
    ...keep,
    contexts,
    forms,
    formIpas: Object.keys(formIpas).length ? formIpas : undefined,
    pronunciation: keep.pronunciation || from.pronunciation,
    emoji: keep.emoji ?? from.emoji,
    note: notes.length ? [...new Set(notes)].join('\n') : undefined,
    definitions: definitions.length ? definitions : undefined,
    audio: keep.audio?.length ? keep.audio : from.audio ?? keep.audio,
    masteryLevel: ahead.masteryLevel ?? 'Seen',
    quiz: mergeQuiz(ahead.quiz, behind.quiz),
    history: mergeHistories(keep.history, from.history),
    savedAt: keep.savedAt !== undefined && from.savedAt !== undefined ? Math.min(keep.savedAt, from.savedAt) : keep.savedAt ?? from.savedAt,
    lastLookedUp: Math.max(keep.lastLookedUp, from.lastLookedUp),
  };
}

/**
 * Undoes a merge for one form: it becomes its own word again, taking the contexts whose line has it,
 * e.g. "Vous voulez" for voulez. Quiz answers stay with the word, as they can't be told apart.
 */
export function splitForm(entry: WordEntry, form: string, id: string, now: number): [WordEntry, WordEntry] {
  const hasForm = (c: WordContext) => findWordSpots([c.context], form, () => false).length > 0;
  const moved = entry.contexts.filter(hasForm);
  const kept: WordEntry = {
    ...entry,
    forms: (entry.forms ?? []).filter((f) => f !== form),
    contexts: entry.contexts.filter((c) => !hasForm(c)),
  };
  if (kept.forms!.length === 0) delete kept.forms;
  const ownIpa = formIpa(entry, form);
  if (entry.formIpas) {
    const rest = Object.fromEntries(Object.entries(entry.formIpas).filter(([k]) => k.toLowerCase() !== form.toLowerCase()));
    if (Object.keys(rest).length) kept.formIpas = rest;
    else delete kept.formIpas;
  }
  const split: WordEntry = {
    id,
    word: form,
    language: entry.language,
    pronunciation: ownIpa ?? '',
    contexts: moved,
    lastLookedUp: now,
    savedAt: now,
    masteryLevel: 'Seen',
    history: [{ at: now, level: 'Seen', saved: true }],
  };
  return [kept, split];
}

/** A meaning's first letter in lowercase, e.g. "That" -> "that"; acronyms and names like "TV" or "McDonald's" stay */
export const lowerFirst = (text: string): string =>
  /^\p{Lu}\p{Ll}/u.test(text) || /^\p{Lu}$/u.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;

/** Whether a saved word or any of its meanings starts with a capital that lowercasing would change */
export const hasCapitals = (entry: WordEntry): boolean =>
  entry.word !== entry.word.toLowerCase() ||
  entry.contexts.some((c) => !!c.definition && lowerFirst(c.definition) !== c.definition) ||
  (entry.definitions ?? []).some((d) => lowerFirst(d.text) !== d.text);

/** The word and its meanings in lowercase, e.g. Sodass -> sodass, "That" -> "that" */
export const lowercaseEntry = (entry: WordEntry): WordEntry => ({
  ...entry,
  word: entry.word.toLowerCase(),
  forms: entry.forms?.map((f) => f.toLowerCase()),
  formIpas: entry.formIpas && Object.fromEntries(Object.entries(entry.formIpas).map(([k, v]) => [k.toLowerCase(), v])),
  contexts: entry.contexts.map((c) => (c.definition ? { ...c, definition: lowerFirst(c.definition) } : c)),
  definitions: entry.definitions?.map((d) => ({ ...d, text: lowerFirst(d.text) })),
});

/** The saved words that are forms of this one, e.g. voulez and veux for vouloir */
export const linkedForms = (words: WordEntry[], entry: WordEntry): WordEntry[] =>
  words.filter((w) => w.baseId === entry.id && w.id !== entry.id).sort((a, b) => a.word.localeCompare(b.word));

/** The word a form is linked to, if it is still saved */
export const baseOf = (words: WordEntry[], entry: WordEntry): WordEntry | undefined =>
  entry.baseId ? words.find((w) => w.id === entry.baseId && w.id !== entry.id) : undefined;

/**
 * Links words as forms of a base (or unlinks them when baseId is undefined). Bases stay one level deep: a base that
 * is itself a form links to its own base, and a word that had forms takes them along to its new base.
 */
export function linkForms(words: WordEntry[], ids: string[], baseId: string | undefined): WordEntry[] {
  let target = baseId;
  const seen = new Set<string>();
  while (target && !seen.has(target)) {
    seen.add(target);
    const up = words.find((w) => w.id === target)?.baseId;
    if (!up) break;
    target = up;
  }
  const moving = new Set(ids.filter((id) => id !== target));
  return words.map((w) => {
    if (moving.has(w.id)) {
      if (!target) {
        const { baseId: _gone, ...rest } = w;
        return rest;
      }
      return { ...w, baseId: target };
    }
    // Forms of a word that became a form follow it to the new base
    if (target && w.baseId && moving.has(w.baseId)) return { ...w, baseId: target };
    return w;
  });
}
