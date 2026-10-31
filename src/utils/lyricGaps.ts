import { removeStressMarks } from './russianStress';
import { getLanguageNameFromCode } from '../constants/languages';
import type { WordEntry } from '../types';
import { removeSpecialChars } from './cleanLyrics';
import { isCoolingDown, quizKindFor } from './wordQuiz';

/** Saved words in the song's languages by lowercased word, the first one saved for a word winning */
export function songWordIndex(words: WordEntry[], originalLanguages: string[] | undefined): Map<string, WordEntry> {
  const songLanguages = new Set(
    (originalLanguages ?? []).map((language) => (getLanguageNameFromCode(language) ?? language).toLowerCase())
  );
  const index = new Map<string, WordEntry>();
  for (const entry of words) {
    const language = (getLanguageNameFromCode(entry.language) ?? entry.language).toLowerCase();
    if (songLanguages.size === 0 || songLanguages.has(language)) {
      // A Russian word saved with its stress mark, like любо́вь, is the lyrics' любовь
      const key = removeStressMarks(entry.word.toLowerCase());
      if (!index.has(key)) index.set(key, entry);
    }
  }
  return index;
}

/** Wrong options for a gap are other saved words in the song's language, so it takes a few */
export const canFillGaps = (index: Map<string, WordEntry>) => index.size >= 3;

/** The saved word a lyric word is a gap for, as saved, when it's learned enough to recall and not just quizzed */
export function gapWord(index: Map<string, WordEntry>, cleanedWord: string, now: number): WordEntry | undefined {
  const entry = index.get(cleanedWord.toLowerCase());
  return entry && quizKindFor(entry.masteryLevel) === 'lyric' && !isCoolingDown(entry.quiz, now) ? entry : undefined;
}

/** How many saved words the lyrics have as gaps */
export function countGaps(lyrics: string, gapFor: (cleanedWord: string) => WordEntry | undefined): number {
  const gaps = new Set<string>();
  for (const token of lyrics.split(/\s+/)) {
    const entry = gapFor(removeSpecialChars(token));
    if (entry) gaps.add(entry.id);
  }
  return gaps.size;
}
