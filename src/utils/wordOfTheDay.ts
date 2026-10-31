import type { WordContext, WordEntry } from '../types';

/** A small string hash, so each day lands on the same word all day */
function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * The day's word: a saved word with a meaning that isn't Known yet (or any with a meaning once all are),
 * and its line from a song, if one was saved
 */
export function wordOfTheDay(
  words: WordEntry[],
  day: string
): { entry: WordEntry; context: WordContext; definition: string } | null {
  const withMeaning = words
    .map((entry) => {
      const context = entry.contexts?.find((c) => c.definition?.trim() && c.context?.trim() && c.songId) ??
        entry.contexts?.find((c) => c.definition?.trim());
      return context ? { entry, context, definition: context.definition!.trim() } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.entry.id.localeCompare(b.entry.id));
  const learning = withMeaning.filter((item) => item.entry.masteryLevel !== 'Known');
  const pool = learning.length ? learning : withMeaning;
  return pool.length ? pool[hash(day) % pool.length] : null;
}
