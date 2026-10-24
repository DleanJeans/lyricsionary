import { removeSpecialChars } from './cleanLyrics';
import { splitElisionParts } from './wordTransform';

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

const ELISION_LANGUAGES = new Set(['french', 'fr', 'italian', 'it']);
// Words whose apostrophe isn't an elision
const APOSTROPHE_WORDS = new Set(["aujourd'hui", "prud'homme", "presqu'île", "entr'acte"]);

/** A lyric token without punctuation, e.g. "dich" for "dich," */
function cleanToken(token: string): string {
  return removeSpecialChars(token).replace(/^['-]+|['-]+$/g, '');
}

/**
 * The word a French or Italian elision is about, e.g. "aime" for "j'aime" or "umanità" for
 * "dell'umanità"; null for other words and languages
 */
function getElidedWord(word: string, languages: string[] | undefined): string | null {
  if (!languages?.some((language) => ELISION_LANGUAGES.has(language.toLowerCase()))) return null;
  if (APOSTROPHE_WORDS.has(word.toLowerCase())) return null;
  const parts = splitElisionParts(word);
  return parts ? parts[parts.length - 1] : null;
}

/**
 * Count how often each word appears across the original lyrics of saved songs,
 * sorted by occurrences (most frequent first). Words are grouped
 * case-insensitively per song language, and French and Italian elisions count as the word they're
 * about ("j'aime" as "aime"). `isIgnored` filters out ignored words.
 */
export function countWordOccurrences(
  songs: SongLyrics[],
  isIgnored: (word: string, language: string) => boolean = () => false
): WordFrequency[] {
  const entries = new Map<string, { language: string; count: number; songs: Set<number>; spellings: Map<string, number> }>();

  songs.forEach((song, songIndex) => {
    const language = song.originalLanguages?.[0] || 'unknown';
    for (const token of song.originalLyrics.split(/\s+/)) {
      const cleaned = cleanToken(token);
      const word = getElidedWord(cleaned, song.originalLanguages) ?? cleaned;
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

/**
 * Count the words in `lyrics` that `isKnown` accepts (saved or ignored), using
 * the same whitespace split as the song's total word count. A French or Italian
 * elision is known when the word it's about is, e.g. "j'aime" when "aime" is.
 */
export function countKnownWords(lyrics: string, isKnown: (word: string) => boolean, languages?: string[]): number {
  let count = 0;
  for (const token of lyrics.split(/\s+/)) {
    const word = cleanToken(token);
    if (!word) continue;
    const elided = getElidedWord(word, languages);
    if (isKnown(word) || (elided && isKnown(elided))) count++;
  }
  return count;
}
