import { removeSpecialChars } from './cleanLyrics';

export interface WordFrequency {
  word: string;  // Most common spelling in the lyrics
  language: string;
  count: number;
  songCount: number;
}

interface SongLyrics {
  originalLyrics: string;
  originalLanguages?: string[];
}

/**
 * Count how often each word appears across the original lyrics of saved songs,
 * sorted by occurrences (most frequent first). Words are grouped
 * case-insensitively per song language. `isIgnored` filters out ignored words.
 */
export function countWordOccurrences(
  songs: SongLyrics[],
  isIgnored: (word: string, language: string) => boolean = () => false
): WordFrequency[] {
  const entries = new Map<string, { language: string; count: number; songs: Set<number>; spellings: Map<string, number> }>();

  songs.forEach((song, songIndex) => {
    const language = song.originalLanguages?.[0] || 'unknown';
    for (const token of song.originalLyrics.split(/\s+/)) {
      const word = removeSpecialChars(token).replace(/^['-]+|['-]+$/g, '');
      if (!/\p{L}/u.test(word)) continue;
      if (isIgnored(word, language)) continue;
      const key = `${language}\u0000${word.toLowerCase()}`;
      let entry = entries.get(key);
      if (!entry) {
        entry = { language, count: 0, songs: new Set(), spellings: new Map() };
        entries.set(key, entry);
      }
      entry.count++;
      entry.songs.add(songIndex);
      entry.spellings.set(word, (entry.spellings.get(word) ?? 0) + 1);
    }
  });

  return [...entries.values()]
    .map((e) => ({
      word: [...e.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0],
      language: e.language,
      count: e.count,
      songCount: e.songs.size,
    }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}
