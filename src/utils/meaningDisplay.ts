import type { WordEntry, WordContext } from '../types';

/** A meaning to show above a word in full, up to its first ; or , or ( e.g. "to be able to; can" -> "to be able to" */
export function shortMeaning(text: string): string {
  return text.split(/[;,(]/)[0].trim() || text.trim();
}

/** The meaning picked (or the one that fits the line's translation, when given) for the word in this line, else the first one saved */
export function meaningAbove(entry: WordEntry, ctx?: WordContext | null, fitting?: string | null): string {
  const text = fitting
    || ctx?.definition
    || entry.contexts.find((c) => c.definition)?.definition
    || entry.definitions?.[0]?.text
    || '';
  return text ? shortMeaning(text) : '';
}
