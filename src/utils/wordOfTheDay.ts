import { isRomanized } from '../constants/languages';
import type { Song, WordContext, WordEntry } from '../types';
import { findWordOccurrences } from './wordOccurrences';

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

/**
 * The line split around the day's word, so it can be highlighted: the saved occurrence of the word,
 * or of one of its merged forms when the line has the form instead. No highlight if neither is there.
 */
export function highlightWord(
  line: string,
  spellings: string[],
  occurrence = 1
): { before: string; word: string; after: string } | null {
  for (const spelling of spellings) {
    const ranges = findWordOccurrences(line, spelling);
    if (!ranges.length) continue;
    const [start, end] = ranges[Math.min(Math.max(occurrence, 1), ranges.length) - 1];
    return { before: line.slice(0, start), word: line.slice(start, end), after: line.slice(end) };
  }
  return null;
}

/**
 * The song's translation of a line (each line of it, for a saved context over a few lines), from
 * every translation that isn't the Romanized one and says something other than the line itself
 */
export function lineTranslation(song: Song, line: string): string | null {
  const originalLines = song.originalLyrics.split('\n').map((l) => l.trim());
  const translations = song.translations
    .filter((t) => !isRomanized(t.language))
    .map((t) => t.lyrics.split('\n'));
  if (!translations.length) return null;
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const translated = line
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((contextLine) => {
      const index = originalLines.findIndex((l) => same(l, contextLine));
      if (index < 0) return '';
      return translations
        .map((lines) => lines[index]?.trim() ?? '')
        .filter((text) => text && !same(text, contextLine))
        .join(' / ');
    });
  return translated.some(Boolean) ? translated.filter(Boolean).join('\n') : null;
}
