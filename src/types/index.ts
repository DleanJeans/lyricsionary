export interface Song {
  id: string;
  songName: string;
  artistName: string;
  originalLyrics: string;
  translations: Translation[];
  createdAt: number;
  updatedAt: number;
}

export interface Translation {
  language: string;
  lyrics: string;
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
