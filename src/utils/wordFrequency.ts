import { getLanguageNameFromCode } from '../constants/languages';
import { cjkCharacterCount, groupCjkTokens, isCjkWord } from './cjkWords';
import { isLyricWord, removeSpecialChars, splitLyricTokens } from './cleanLyrics';
import { isGermanLanguage } from './compoundWords';
import { getGermanExpandedForm, splitElisionParts } from './wordTransform';

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

/** A lyric token without punctuation, e.g. "dich" for "dich,"; trailing apostrophes stay for getFullWord ("hab'") */
function cleanToken(token: string): string {
  return removeSpecialChars(token).replace(/^['-]+|-+$/g, '');
}

function withoutTrailingApostrophes(word: string): string {
  return word.replace(/['-]+$/, '');
}

/**
 * The full word a shortened lyric stands for: what a French or Italian elision is about, e.g.
 * "aime" for "j'aime" or "umanità" for "dell'umanità", or a German shortened word's full form, e.g.
 * "haben" for "hab'n"; null for other words and languages
 */
function getFullWord(word: string, languages: string[] | undefined): string | null {
  if (isGermanLanguage(languages)) return getGermanExpandedForm(word, 'German');
  if (!languages?.some((language) => ELISION_LANGUAGES.has(language.toLowerCase()))) return null;
  const parts = splitElisionParts(word);
  return parts ? parts[parts.length - 1] : null;
}

/**
 * Count how often each word appears across the original lyrics of saved songs,
 * sorted by occurrences (most frequent first). Words are grouped
 * case-insensitively per song language, and shortened words count as their full word ("j'aime" as
 * "aime", German "hab'n" as "haben"). `isIgnored` filters out ignored words.
 */
export function countWordOccurrences(
  songs: SongLyrics[],
  isIgnored: (word: string, language: string) => boolean = () => false
): WordFrequency[] {
  const entries = new Map<string, { language: string; count: number; songs: Set<number>; spellings: Map<string, { count: number; midLine: number }> }>();

  songs.forEach((song, songIndex) => {
    const songLanguage = song.originalLanguages?.[0] || 'unknown';
    // By name, so a song saved as "fr" and one saved as "French" count together
    const language = getLanguageNameFromCode(songLanguage) ?? songLanguage;
    // A line's first word is capitalized whatever it is, e.g. "Des" in "Des bijoux de chez Chanel"
    const tokens = song.originalLyrics.split('\n').flatMap((line) =>
      splitLyricTokens(line).filter((token) => token.trim()).map((token, index) => ({ token, startsLine: index === 0 }))
    );
    for (const { token, startsLine } of tokens) {
      const cleaned = cleanToken(token);
      const word = getFullWord(cleaned, song.originalLanguages) ?? withoutTrailingApostrophes(cleaned);
      if (!isLyricWord(word)) continue;
      if (isIgnored(word, songLanguage)) continue;
      const key = `${language}\u0000${word.toLowerCase()}`;
      let entry = entries.get(key);
      if (!entry) {
        entry = { language, count: 0, songs: new Set(), spellings: new Map() };
        entries.set(key, entry);
      }
      entry.count++;
      entry.songs.add(songIndex);
      const spelling = entry.spellings.get(word) ?? { count: 0, midLine: 0 };
      spelling.count++;
      if (!startsLine) spelling.midLine++;
      entry.spellings.set(word, spelling);
    }
  });

  return [...entries.values()]
    .map((e) => ({
      // Spelled as it's most often written within a line, e.g. "des" over a line's first "Des"
      word: [...e.spellings.entries()].sort((a, b) => b[1].midLine - a[1].midLine || b[1].count - a[1].count)[0][0],
      language: e.language,
      count: e.count,
      songCount: e.songs.size,
    }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

/**
 * The words in `lyrics` without punctuation, skipping tokens like "—", "...", "2" or the "x2" in "(x2)";
 * each Chinese, Japanese or Korean character is one, as Learn lets each be tapped
 */
function lyricWords(lyrics: string): string[] {
  return splitLyricTokens(lyrics).map(cleanToken).filter(isLyricWord);
}

/** The number of words in `lyrics`; dashes, ellipses, numbers and repeat markers aren't words to learn */
export function countWords(lyrics: string): number {
  return lyricWords(lyrics).length;
}

/**
 * Count the words in `lyrics` that `isKnown` accepts (saved or ignored), out of
 * the words countWords counts. A shortened word is
 * known when its full word is, e.g. "j'aime" when "aime" is, or "hab'n" when "haben" is. Each
 * character of a saved Chinese or Japanese word is known, e.g. both of 二人's.
 */
export function countKnownWords(lyrics: string, isKnown: (word: string) => boolean, languages?: string[]): number {
  let count = 0;
  // Chinese and Japanese characters in a saved word like 二人 are each known
  for (const token of groupCjkTokens(splitLyricTokens(lyrics), isKnown)) {
    const cleaned = cleanToken(token);
    if (!isLyricWord(cleaned)) continue;
    if (isCjkWord(cleaned)) {
      if (isKnown(cleaned)) count += cjkCharacterCount(cleaned);
      continue;
    }
    const word = withoutTrailingApostrophes(cleaned);
    const full = getFullWord(cleaned, languages);
    if (isKnown(word) || (full && isKnown(full))) count++;
  }
  return count;
}
