import type { Song } from '../types';

/** Lines are ignored by their text, so every repeat of a line goes together (like line notes) */
export const lineIgnoreKey = (line: string) => line.trim();

export const isLineIgnored = (song: Pick<Song, 'ignoredLines'> | undefined, line: string) =>
  !!song?.ignoredLines?.length && song.ignoredLines.includes(lineIgnoreKey(line));

const cache = new WeakMap<object, string>();

/**
 * The song's original lyrics with its ignored lines emptied, so words in them (say the English
 * lines in a Portuguese song) are neither counted, quizzed nor listed. Line numbers stay the same.
 */
export function lyricsToLearn(song: Pick<Song, 'originalLyrics' | 'ignoredLines'>): string {
  if (!song.ignoredLines?.length) return song.originalLyrics;
  const kept = cache.get(song);
  if (kept !== undefined) return kept;
  const ignored = new Set(song.ignoredLines);
  const lyrics = song.originalLyrics.split('\n').map((line) => (ignored.has(lineIgnoreKey(line)) ? '' : line)).join('\n');
  cache.set(song, lyrics);
  return lyrics;
}
