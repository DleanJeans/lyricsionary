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

export interface WordEntry {
  id: string;
  word: string;
  language: string;
  pronunciation: string;
  lookupCount: number;
  lastLookedUp: number;
}

export type RootTabParamList = {
  Editor: { songId?: string } | undefined;
  Web: { url?: string } | undefined;
  Learn: { songId?: string } | undefined;
  Lyrics: undefined;
  Words: undefined;
};
