import { useMemo, useRef } from 'react';
import { removeStressMarks } from '../utils/russianStress';
import { getLanguageNameFromCode } from '../constants/languages';
import { makeIgnoredWordChecker, useStore } from '../store/useStore';
import { Song } from '../types';
import { buildKnownGermanWords, getCompoundParts, isGermanLanguage } from '../utils/compoundWords';
import { phraseStartsOf } from '../utils/cjkWords';
import { spellingsOf } from '../utils/wordForms';
import { countKnownWords, countWords } from '../utils/wordFrequency';

export interface WordProgress {
  known: number;
  total: number;
  percent: number;
  /** Different words not known yet, each counted once however often the song repeats it */
  newWords: number;
  /** e.g. "12/40 words (30%)" */
  label: string;
}

/**
 * Makes a checker for whether a song's word is known (saved, ignored or a compound of saved words),
 * with the first words of the known phrases (phraseStartsOf) to look for phrases from
 */
function useKnownWordChecker(): ((song: Song) => (word: string) => boolean) & { phraseStarts: Set<string> } {
  const words = useStore((s) => s.words);
  const ignoredWords = useStore((s) => s.ignoredWords);
  const compoundSplits = useStore((s) => s.compoundSplits);

  // Saved words keyed by "language\u0000word", with language names normalized like LearnScreen, and
  // by word alone for songs with no language, which Learn matches against saved words in any language
  const { savedWordKeys, savedWordsAnyLanguage } = useMemo(() => {
    const keys = new Set<string>();
    const anyLanguage = new Set<string>();
    for (const entry of words) {
      const language = (getLanguageNameFromCode(entry.language) ?? entry.language).toLowerCase();
      // A Russian word saved with its stress mark, like любо́вь, is the lyrics' любовь; a merged form is known too
      for (const spelling of spellingsOf(entry)) {
        const word = removeStressMarks(spelling.toLowerCase());
        keys.add(`${language}\u0000${word}`);
        anyLanguage.add(word);
      }
    }
    return { savedWordKeys: keys, savedWordsAnyLanguage: anyLanguage };
  }, [words]);

  // Whether a German compound splits into saved words, like Learn shows it, e.g. Liebesbrief once
  // Liebe and Brief are saved; cached per word since every song's lyrics are checked
  const isKnownCompound = useMemo(() => {
    const knownGermanWords = buildKnownGermanWords(words);
    const cache = new Map<string, boolean>();
    return (word: string) => {
      const lower = word.toLowerCase();
      let known = cache.get(lower);
      if (known === undefined) {
        const parts = getCompoundParts(word, compoundSplits, knownGermanWords);
        known = !!parts && parts.every((part) => knownGermanWords.has(part.lemma));
        cache.set(lower, known);
      }
      return known;
    };
  }, [words, compoundSplits]);

  return useMemo(() => {
    const isIgnored = makeIgnoredWordChecker(ignoredWords);
    const phraseStarts = phraseStartsOf([...savedWordsAnyLanguage, ...ignoredWords.map((w) => w.word)]);
    const checker = (song: Song) => {
      const languages = (song.originalLanguages ?? []).map((l) => (getLanguageNameFromCode(l) ?? l).toLowerCase());
      const ignoreLanguage = song.originalLanguages?.[0] || 'unknown';
      const isGermanSong = isGermanLanguage(song.originalLanguages);
      return (word: string) => {
        const lower = word.toLowerCase();
        return (
          (languages.length === 0
            ? savedWordsAnyLanguage.has(lower)
            : languages.some((language) => savedWordKeys.has(`${language}\u0000${lower}`))) ||
          isIgnored(word, ignoreLanguage) ||
          (isGermanSong && isKnownCompound(word))
        );
      };
    };
    return Object.assign(checker, { phraseStarts });
  }, [savedWordKeys, savedWordsAnyLanguage, ignoredWords, isKnownCompound]);
}

/**
 * How many of each song's words are known (saved or ignored), by song id. Computed once per change
 * to the songs or known words, not on every render (typing in a search box re-renders a list).
 */
export function useWordProgress(songs: Song[]): Map<string, WordProgress> {
  const knownChecker = useKnownWordChecker();
  // Each song's progress until the known words change, so opening a song, which updates just its
  // open count, doesn't count every song's words again
  const cache = useRef<{ checker: typeof knownChecker; bySong: WeakMap<Song, WordProgress> } | null>(null);
  if (cache.current?.checker !== knownChecker) cache.current = { checker: knownChecker, bySong: new WeakMap() };
  const bySong = cache.current.bySong;
  return useMemo(() => {
    const progress = new Map<string, WordProgress>();
    for (const song of songs) {
      const cached = bySong.get(song);
      if (cached) {
        progress.set(song.id, cached);
        continue;
      }
      const total = countWords(song.originalLyrics);
      const unknown = new Set<string>();
      const known = countKnownWords(
        song.originalLyrics,
        knownChecker(song),
        song.originalLanguages,
        (word) => unknown.add(word.toLowerCase()),
        knownChecker.phraseStarts
      );
      const percent = total > 0 ? Math.floor((known / total) * 100) : 0;
      const songProgress = { known, total, percent, newWords: unknown.size, label: `${known}/${total} words (${percent}%)` };
      bySong.set(song, songProgress);
      progress.set(song.id, songProgress);
    }
    return progress;
  }, [songs, knownChecker, bySong]);
}

/**
 * The line to learn next: the one with the fewest new words that still has some, so a line is
 * finished in a few taps; the earliest of those. Null once every line is known.
 */
export function useNextLineToLearn(song: Song | undefined, lines: string[]): number | null {
  const knownChecker = useKnownWordChecker();
  return useMemo(() => {
    if (!song) return null;
    const isKnown = knownChecker(song);
    return pickNextLine(lines.map((line) => {
      let unknown = 0;
      countKnownWords(line, isKnown, song.originalLanguages, () => unknown++, knownChecker.phraseStarts);
      return unknown;
    }));
  }, [song, lines, knownChecker]);
}

/** The line with the fewest new words above none, the earliest on a tie */
export function pickNextLine(newWordCounts: number[]): number | null {
  let best: number | null = null;
  newWordCounts.forEach((count, index) => {
    if (count > 0 && (best === null || count < newWordCounts[best])) best = index;
  });
  return best;
}
