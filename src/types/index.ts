import type { WiktionaryAudio } from '../utils/wiktionary';

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
}

export type MasteryLevel = 'Unknown' | 'New' | 'Learning' | 'Mastered';

export interface WordEntry {
  id: string;
  word: string;
  language: string;
  pronunciation: string;
  contexts: WordContext[];
  lastLookedUp: number;
  masteryLevel?: MasteryLevel;
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
