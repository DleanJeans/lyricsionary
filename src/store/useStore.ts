import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song, Translation, WordEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { GOOGLE_SEARCH_URL } from '../constants/urls';

const SONGS_KEY = '@lyricsionary_songs';
const WORDS_KEY = '@lyricsionary_words';

interface AppState {
  songs: Song[];
  words: WordEntry[];
  currentSongId: string | null;
  webUrl: string;
  scrapeTargetTab: number;
  fontSize: number;
  showTranslations: boolean;

  // Song actions
  loadSongs: () => Promise<void>;
  saveSong: (songName: string, artistName: string, originalLyrics: string, translations: Translation[], sourceUrl?: string, sourceUrlTitle?: string) => Promise<Song>;
  updateSong: (id: string, updates: Partial<Omit<Song, 'id' | 'createdAt'>>) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  setCurrentSongId: (id: string | null) => void;
  trackSongOpen: (id: string) => Promise<void>;

  // Web actions
  setWebUrl: (url: string) => void;
  setScrapeTargetTab: (tab: number) => void;

  // Learn actions
  setFontSize: (size: number) => void;
  toggleTranslations: () => void;

  // Word actions
  loadWords: () => Promise<void>;
  addOrUpdateWord: (word: string, language: string, pronunciation?: string) => Promise<void>;
  deleteWord: (id: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  songs: [],
  words: [],
  currentSongId: null,
  webUrl: GOOGLE_SEARCH_URL,
  scrapeTargetTab: 0,
  fontSize: 18,
  showTranslations: true,

  loadSongs: async () => {
    try {
      const json = await AsyncStorage.getItem(SONGS_KEY);
      if (json) {
        const songs = JSON.parse(json);
        // Migration: Initialize lastOpenedAt and openCount for existing songs
        const migratedSongs = songs.map((song: Song) => ({
          ...song,
          lastOpenedAt: song.lastOpenedAt ?? song.updatedAt ?? song.createdAt,
          openCount: song.openCount ?? 0,
        }));
        set({ songs: migratedSongs });
      }
    } catch (e) {
      console.error('Failed to load songs', e);
    }
  },

  saveSong: async (songName, artistName, originalLyrics, translations, sourceUrl, sourceUrlTitle) => {
    const song: Song = {
      id: uuidv4(),
      songName,
      artistName,
      originalLyrics,
      sourceUrl,
      sourceUrlTitle,
      translations,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
      openCount: 0,
    };
    const songs = [...get().songs, song];
    set({ songs, currentSongId: song.id });
    await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(songs));
    return song;
  },

  updateSong: async (id, updates) => {
    const songs = get().songs.map((s) =>
      s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
    );
    set({ songs });
    await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(songs));
  },

  deleteSong: async (id) => {
    const songs = get().songs.filter((s) => s.id !== id);
    set({ songs });
    if (get().currentSongId === id) set({ currentSongId: null });
    await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(songs));
  },

  setCurrentSongId: (id) => set({ currentSongId: id }),

  trackSongOpen: async (id) => {
    const songs = get().songs.map((s) =>
      s.id === id
        ? { ...s, lastOpenedAt: Date.now(), openCount: (s.openCount ?? 0) + 1 }
        : s
    );
    set({ songs });
    await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(songs));
  },

  setWebUrl: (url) => set({ webUrl: url }),
  setScrapeTargetTab: (tab) => set({ scrapeTargetTab: tab }),

  setFontSize: (size) => set({ fontSize: Math.max(12, Math.min(32, size)) }),

  toggleTranslations: () => set((s) => ({ showTranslations: !s.showTranslations })),

  loadWords: async () => {
    try {
      const json = await AsyncStorage.getItem(WORDS_KEY);
      if (json) set({ words: JSON.parse(json) });
    } catch (e) {
      console.error('Failed to load words', e);
    }
  },

  addOrUpdateWord: async (word, language, pronunciation = '') => {
    const existing = get().words.find(
      (w) => w.word.toLowerCase() === word.toLowerCase() && w.language === language
    );
    let words: WordEntry[];
    if (existing) {
      words = get().words.map((w) =>
        w.id === existing.id
          ? { ...w, lookupCount: w.lookupCount + 1, lastLookedUp: Date.now(), pronunciation: pronunciation || w.pronunciation }
          : w
      );
    } else {
      const entry: WordEntry = {
        id: uuidv4(),
        word,
        language,
        pronunciation,
        lookupCount: 1,
        lastLookedUp: Date.now(),
      };
      words = [...get().words, entry];
    }
    set({ words });
    await AsyncStorage.setItem(WORDS_KEY, JSON.stringify(words));
  },

  deleteWord: async (id) => {
    const words = get().words.filter((w) => w.id !== id);
    set({ words });
    await AsyncStorage.setItem(WORDS_KEY, JSON.stringify(words));
  },
}));
