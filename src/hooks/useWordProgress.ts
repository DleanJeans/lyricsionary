import { useMemo } from 'react';
import { getLanguageNameFromCode } from '../constants/languages';
import { makeIgnoredWordChecker, useStore } from '../store/useStore';
import { Song } from '../types';
import { buildKnownGermanWords, getCompoundParts, isGermanLanguage } from '../utils/compoundWords';
import { countKnownWords, countWords } from '../utils/wordFrequency';

export interface WordProgress {
  known: number;
  total: number;
  percent: number;
  /** e.g. "12/40 words (30%)" */
  label: string;
}

/**
 * How many of each song's words are known (saved or ignored), by song id. Computed once per change
 * to the songs or known words, not on every render (typing in a search box re-renders a list).
 */
export function useWordProgress(songs: Song[]): Map<string, WordProgress> {
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
      const word = entry.word.toLowerCase();
      keys.add(`${language}\u0000${word}`);
      anyLanguage.add(word);
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
    const progress = new Map<string, WordProgress>();
    const isIgnored = makeIgnoredWordChecker(ignoredWords);
    for (const song of songs) {
      const languages = (song.originalLanguages ?? []).map((l) => (getLanguageNameFromCode(l) ?? l).toLowerCase());
      const ignoreLanguage = song.originalLanguages?.[0] || 'unknown';
      const isGermanSong = isGermanLanguage(song.originalLanguages);
      const total = countWords(song.originalLyrics);
      const known = countKnownWords(song.originalLyrics, (word) => {
        const lower = word.toLowerCase();
        return (
          (languages.length === 0
            ? savedWordsAnyLanguage.has(lower)
            : languages.some((language) => savedWordKeys.has(`${language}\u0000${lower}`))) ||
          isIgnored(word, ignoreLanguage) ||
          (isGermanSong && isKnownCompound(word))
        );
      }, song.originalLanguages);
      const percent = total > 0 ? Math.floor((known / total) * 100) : 0;
      progress.set(song.id, { known, total, percent, label: `${known}/${total} words (${percent}%)` });
    }
    return progress;
  }, [songs, savedWordKeys, savedWordsAnyLanguage, ignoredWords, isKnownCompound]);
}
