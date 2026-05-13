export interface Song {
  id: string;
  songName: string;
  artistName: string;
  originalLyrics: string;
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

export interface WordDefinition {
  text: string;
  songId?: string;
  songName?: string;
  lyricsLine?: string;
}

export interface WordEntry {
  id: string;
  word: string;
  language: string;
  pronunciation: string;
  definitions: WordDefinition[];
  lookupCount: number;
  lastLookedUp: number;
  emoji?: string;
}

export type RootTabParamList = {
  Editor: { songId?: string } | undefined;
  Web: { url?: string } | undefined;
  Learn: { songId?: string } | undefined;
  Lyrics: undefined;
  Words: undefined;
  WordLookup: { word: string; songId?: string; songName?: string; artistName?: string; lyricsLine?: string } | undefined;
};
