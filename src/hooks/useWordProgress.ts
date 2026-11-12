import { useDeferredValue, useMemo, useRef } from 'react';
import { removeStressMarks } from '../utils/russianStress';
import { getLanguageNameFromCode } from '../constants/languages';
import { makeIgnoredWordChecker } from '../store/useStore';
import { Song, WordEntry } from '../types';
import { buildKnownGermanWords, getCompoundParts, isGermanLanguage } from '../utils/compoundWords';
import { phraseStartsOf } from '../utils/cjkWords';
import { spellingsOf } from '../utils/wordForms';
import { countKnownWords, countWords } from '../utils/wordFrequency';
import { changedSpellings, SongWordCache } from '../utils/songWordCache';
import { useStoreWhileShown } from './useStoreWhileShown';

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
 * The saved words, kept the same until a word is saved, removed, respelled or saved from another
 * song. Which words are known is all progress needs, so answering a quiz, which changes just a word's
 * level, doesn't count every song's words again. Read levels from the store's words, not these.
 * They follow the store a render behind, so a save or merge shows first and every song's progress is
 * counted again after it.
 */
export function useKnownWords(): WordEntry[] {
  const words = useDeferredValue(useStoreWhileShown((s) => s.words));
  const key = useMemo(
    () => words.map((entry) =>
      [entry.id, entry.language, ...spellingsOf(entry), ...(entry.contexts ?? []).map((c) => c.songId ?? '')].join('\u0001')
    ).join('\u0000'),
    [words]
  );
  const kept = useRef<{ key: string; words: WordEntry[] } | null>(null);
  if (kept.current?.key !== key) kept.current = { key, words };
  return kept.current.words;
}

/**
 * Makes a checker for whether a song's word is known (saved, ignored or a compound of saved words),
 * with the first words of the known phrases (phraseStartsOf) to look for phrases from
 */
type KnownWordChecker = ((song: Song) => (word: string) => boolean) & {
  phraseStarts: Set<string>;
  knownSpellings: Set<string>;
  compoundSplits: Record<string, string[]>;
};

function useKnownWordChecker(): KnownWordChecker {
  const words = useKnownWords();
  const ignoredWords = useStoreWhileShown((s) => s.ignoredWords);
  const compoundSplits = useStoreWhileShown((s) => s.compoundSplits);

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
    // Every spelling known in any language, to tell which words a change made known or not
    const knownSpellings = new Set(savedWordsAnyLanguage);
    for (const ignored of ignoredWords) knownSpellings.add(ignored.word.toLowerCase());
    return Object.assign(checker, { phraseStarts, knownSpellings, compoundSplits });
  }, [savedWordKeys, savedWordsAnyLanguage, ignoredWords, isKnownCompound, compoundSplits]);
}

/**
 * How many of each song's words are known (saved or ignored), by song id. Computed once per change
 * to the songs or known words, not on every render (typing in a search box re-renders a list).
 */
export function useWordProgress(songs: Song[]): Map<string, WordProgress> {
  const knownChecker = useKnownWordChecker();
  // Each song's progress, counted again only for the songs with a word that was saved, removed or
  // ignored since, so opening a song, which updates just its open count, or ignoring a word doesn't
  // count every song's words again
  const cache = useRef<{ checker: KnownWordChecker; bySong: SongWordCache<WordProgress> } | null>(null);
  if (cache.current?.checker !== knownChecker) {
    const before = cache.current;
    if (!before || before.checker.compoundSplits !== knownChecker.compoundSplits) {
      cache.current = { checker: knownChecker, bySong: new SongWordCache() };
    } else {
      before.bySong.forget(changedSpellings(before.checker.knownSpellings, knownChecker.knownSpellings));
      cache.current = { checker: knownChecker, bySong: before.bySong };
    }
  }
  const bySong = cache.current!.bySong;
  return useMemo(() => {
    const progress = new Map<string, WordProgress>();
    for (const song of songs) {
      const songProgress = bySong.count(song, (asking) => {
        const total = countWords(song.originalLyrics);
        const unknown = new Set<string>();
        const isKnown = knownChecker(song);
        const known = countKnownWords(
          song.originalLyrics,
          (word) => {
            asking(word);
            return isKnown(word);
          },
          song.originalLanguages,
          (word) => unknown.add(word.toLowerCase()),
          knownChecker.phraseStarts
        );
        const percent = total > 0 ? Math.floor((known / total) * 100) : 0;
        return { known, total, percent, newWords: unknown.size, label: `${known}/${total} words (${percent}%)` };
      });
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
