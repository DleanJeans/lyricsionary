import type { PartOfSpeech } from '../utils/partOfSpeech';
import type { WiktionaryAudio } from '../utils/wiktionary';
import type { QuizStats } from '../utils/wordQuiz';

export interface Song {
  id: string;
  songName: string;
  artistName: string;
  originalLyrics: string;
  originalLanguages?: string[];
  sourceUrl?: string;
  sourceUrlTitle?: string;
  translations: Translation[];
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
  openCount?: number;
}

export interface Translation {
  language: string;
  lyrics: string;
  sourceUrl?: string;
  sourceUrlTitle?: string;
}

export interface WordContext {
  context: string;
  emoji?: string;
  ipa?: string;
  definition?: string;
  songId?: string;
  songName?: string;
  fromSong?: boolean;
  occurrence?: number;
  translation?: string;
  /** The type of word this sense is, e.g. "noun" for Leben "life" and "verb" for Leben "to live" */
  partOfSpeech?: PartOfSpeech;
}

// Seen: saved, not tested yet. Recognized: picks its meaning from a few. Recalled: comes up with the
// word from its meaning or the lyric. Known: still right after a couple of weeks.
export type MasteryLevel = 'Seen' | 'Recognized' | 'Recalled' | 'Known';
export const MASTERY_LEVELS: MasteryLevel[] = ['Seen', 'Recognized', 'Recalled', 'Known'];

/** The level of a word saved with the old levels, e.g. Learning -> Recognized */
export function toMasteryLevel(level?: string): MasteryLevel {
  switch (level) {
    case 'Recognized':
    case 'Learning':
      return 'Recognized';
    case 'Recalled':
      return 'Recalled';
    case 'Known':
    case 'Mastered':
      return 'Known';
    default:
      return 'Seen';
  }
}

export interface WordEntry {
  id: string;
  word: string;
  language: string;
  pronunciation: string;
  contexts: WordContext[];
  lastLookedUp: number;
  masteryLevel?: MasteryLevel;
  /** Word quiz answers, which move the word up a level */
  quiz?: QuizStats;
  emoji?: string;
  definitions?: { text: string; songId?: string; songName?: string; lyricsLine?: string }[];
  /** Wiktionary's pronunciation recordings, kept so the word doesn't fetch them again; empty when it has none */
  audio?: WiktionaryAudio[];
}

export type RootTabParamList = {
  Editor: { songId?: string } | undefined;
  Web: { url?: string } | undefined;
  Learn: { songId?: string } | undefined;
  Songs: { searchQuery?: string } | undefined;
  Words: undefined;
  WordLookup: {
    word: string;
    wordId?: string;
    songId?: string;
    songName?: string;
    artistName?: string;
    lyricsLine?: string;
    translationLine?: string;
    originalLanguages?: string[];
    source?: 'Learn' | 'Words';
    occurrence?: number;
    // IPA the Look Up card already found, so the page doesn't have to be read again
    ipa?: string[];
  } | undefined;
};
