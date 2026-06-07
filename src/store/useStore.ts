import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song, Translation, WordEntry, WordContext, MasteryLevel } from '../types';
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
  deeplLineMap: number[] | null;  // Stores line mapping for DeepL translation
  deeplChunks: string[] | null;  // Stores chunks for multi-chunk DeepL translation
  deeplCurrentChunk: number;  // Current chunk index being translated
  deeplTranslatedChunks: string[];  // Stores translated chunks
  fontSize: number;
  showTranslations: boolean;
  selectedTranslationLanguages: string[];
  blurTranslations: boolean;
  showMasteryLevelColors: boolean;
  matchedSongsSearchQuery: string | null;
  matchedSongsCount: number;
  isLoadingSong: boolean;

  // Song actions
  loadSongs: () => Promise<void>;
  saveSong: (songName: string, artistName: string, originalLyrics: string, originalLanguages: string[], translations: Translation[], sourceUrl?: string, sourceUrlTitle?: string) => Promise<Song>;
  updateSong: (id: string, updates: Partial<Omit<Song, 'id' | 'createdAt'>>) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  setCurrentSongId: (id: string | null) => void;
  trackSongOpen: (id: string) => Promise<void>;
  setMatchedSongs: (searchQuery: string | null, count: number) => void;
  setIsLoadingSong: (isLoading: boolean) => void;

  // Web actions
  setWebUrl: (url: string) => void;
  setScrapeTargetTab: (tab: number) => void;
  setDeeplLineMap: (lineMap: number[] | null) => void;
  setDeeplChunks: (chunks: string[] | null) => void;
  setDeeplCurrentChunk: (index: number) => void;
  addDeeplTranslatedChunk: (translation: string) => void;
  resetDeeplTranslation: () => void;

  // Learn actions
  setFontSize: (size: number) => void;
  toggleTranslations: () => void;
  setSelectedTranslationLanguages: (languages: string[]) => void;
  toggleBlurTranslations: () => void;
  toggleShowMasteryLevelColors: () => void;

  // Word actions
  loadWords: () => Promise<void>;
  addOrUpdateWord: (
    word: string,
    language: string,
    pronunciation?: string,
    contexts?: WordContext[],
    masteryLevel?: MasteryLevel
  ) => Promise<void>;
  deleteWord: (id: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  songs: [],
  words: [],
  currentSongId: null,
  webUrl: GOOGLE_SEARCH_URL,
  scrapeTargetTab: 0,
  deeplLineMap: null,
  deeplChunks: null,
  deeplCurrentChunk: 0,
  deeplTranslatedChunks: [],
  fontSize: 18,
  showTranslations: true,
  selectedTranslationLanguages: [],
  blurTranslations: true,
  showMasteryLevelColors: false,
  matchedSongsSearchQuery: null,
  matchedSongsCount: 0,
  isLoadingSong: false,

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

  saveSong: async (songName, artistName, originalLyrics, originalLanguages, translations, sourceUrl, sourceUrlTitle) => {
    const song: Song = {
      id: uuidv4(),
      songName,
      artistName,
      originalLyrics,
      originalLanguages,
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

  setMatchedSongs: (searchQuery, count) => set({ matchedSongsSearchQuery: searchQuery, matchedSongsCount: count }),

  setIsLoadingSong: (isLoading) => set({ isLoadingSong: isLoading }),

  setWebUrl: (url) => set({ webUrl: url }),
  setScrapeTargetTab: (tab) => set({ scrapeTargetTab: tab }),
  setDeeplLineMap: (lineMap) => set({ deeplLineMap: lineMap }),
  setDeeplChunks: (chunks) => set({ deeplChunks: chunks }),
  setDeeplCurrentChunk: (index) => set({ deeplCurrentChunk: index }),
  addDeeplTranslatedChunk: (translation) => set((state) => ({
    deeplTranslatedChunks: [...state.deeplTranslatedChunks, translation],
  })),
  resetDeeplTranslation: () => set({
    deeplChunks: null,
    deeplCurrentChunk: 0,
    deeplTranslatedChunks: [],
    deeplLineMap: null,
  }),

  setFontSize: (size) => set({ fontSize: Math.max(12, Math.min(32, size)) }),

  toggleTranslations: () => set((s) => ({ showTranslations: !s.showTranslations })),

  setSelectedTranslationLanguages: (languages) => set({ selectedTranslationLanguages: languages }),

  toggleBlurTranslations: () => set((s) => ({ blurTranslations: !s.blurTranslations })),

  toggleShowMasteryLevelColors: () => set((s) => ({ showMasteryLevelColors: !s.showMasteryLevelColors })),

  loadWords: async () => {
    try {
      const json = await AsyncStorage.getItem(WORDS_KEY);
      if (json) {
        const loadedWords: WordEntry[] = JSON.parse(json);
        // Migrate old words that don't have definitions array or masteryLevel
        const migratedWords = loadedWords.map(w => {
          const contexts = w.contexts || [];
          const needsMigration = contexts.length === 0 && (w.definitions || []).length > 0;
          let migratedContexts = contexts;
          if (needsMigration) {
            migratedContexts = (w.definitions || []).map(d => ({
              context: d.lyricsLine || '',
              emoji: w.emoji || undefined,
              ipa: undefined,
              definition: d.text,
              songId: d.songId,
              songName: d.songName,
              fromSong: !!d.songId,
            }));
          }
          // Migrate contexts missing fromSong
          migratedContexts = migratedContexts.map(c => ({
            ...c,
            fromSong: c.fromSong ?? (!!c.songId && !!c.context),
          }));
          // Also migrate global emoji to contexts if word has emoji but some contexts don't
          if (w.emoji && migratedContexts.length > 0) {
            migratedContexts = migratedContexts.map(c => ({
              ...c,
              emoji: c.emoji || w.emoji,
            }));
          }
          // If still no contexts but has global emoji, create a default context
          if (migratedContexts.length === 0 && w.emoji) {
            migratedContexts = [{ context: '', emoji: w.emoji }];
          }
          return {
            ...w,
            definitions: w.definitions || [],
            contexts: migratedContexts,
            masteryLevel: w.masteryLevel || 'New' as MasteryLevel,
          };
        });
        set({ words: migratedWords });
      }
    } catch (e) {
      console.error('Failed to load words', e);
    }
  },

  addOrUpdateWord: async (word, language, pronunciation = '', contexts: WordContext[] = [], masteryLevel) => {
    const existing = get().words.find(
      (w) => w.word.toLowerCase() === word.toLowerCase() && w.language === language
    );
    let words: WordEntry[];
    if (existing) {
      const updatedContexts = [...(existing.contexts || [])];

      for (const ctx of contexts) {
        if (!ctx.context) continue;
        const contextIndex = updatedContexts.findIndex(c =>
          c.songId === ctx.songId && c.context === ctx.context && (c.occurrence || 1) === (ctx.occurrence || 1)
        );
        if (contextIndex >= 0) {
          updatedContexts[contextIndex] = {
            ...updatedContexts[contextIndex],
            ...ctx,
          };
        } else {
          updatedContexts.push(ctx);
        }
      }

      words = get().words.map((w) =>
        w.id === existing.id
          ? {
              ...w,
              lastLookedUp: Date.now(),
              pronunciation: pronunciation || w.pronunciation,
              contexts: updatedContexts,
              masteryLevel: masteryLevel !== undefined ? masteryLevel : w.masteryLevel,
            }
          : w
      );
    } else {
      const entry: WordEntry = {
        id: uuidv4(),
        word,
        language,
        pronunciation,
        contexts: contexts.filter(c => c.context),
        lastLookedUp: Date.now(),
        masteryLevel: masteryLevel || 'New',
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
