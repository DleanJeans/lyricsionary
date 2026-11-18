import type { WordEntry, WordContext } from '../types';

const MAX_LENGTH = 16;

/** A short form of a meaning to show above a word, cut at a word or comma when long, e.g. "to be able to; can" -> "to be able to" */
export function shortMeaning(text: string, max = MAX_LENGTH): string {
  const first = text.split(/[;,(]/)[0].trim() || text.trim();
  if (first.length <= max) return first;
  const cut = first.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 6 ? cut.slice(0, space) : cut).trimEnd()}…`;
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
