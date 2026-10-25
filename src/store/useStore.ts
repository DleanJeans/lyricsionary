import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { isSameLanguage } from '../constants/languages';
import { GOOGLE_SEARCH_URL } from '../constants/urls';
import { MasteryLevel, Song, Translation, WordContext, WordEntry } from '../types';
import type { WiktionaryAudio } from '../utils/wiktionary';

const SONGS_KEY = '@lyricsionary_songs';
const WORDS_KEY = '@lyricsionary_words';
const IGNORED_WORDS_KEY = '@lyricsionary_ignored_words';
const COMPOUND_SPLITS_KEY = '@lyricsionary_compound_splits';
const LEARN_SETTINGS_KEY = '@lyricsionary_learn_settings';

export interface IgnoredWord {
  word: string;
  language: string;
}

// Automatic lyrics + translation flow started from the now playing notification
export interface AutoFetch {
  songName: string;
  artistName: string;
  step: 'lyrics' | 'translation' | 'translating';
}

export const isWordIgnored = (ignoredWords: IgnoredWord[], word: string, language: string) =>
  ignoredWords.some((w) => w.word === word.toLowerCase() && w.language === language);

// isWordIgnored for checking many words, e.g. every word of every song, with one lookup each
export function makeIgnoredWordChecker(ignoredWords: IgnoredWord[]): (word: string, language: string) => boolean {
  const keys = new Set(ignoredWords.map((w) => `${w.language}\u0000${w.word}`));
  return (word, language) => keys.has(`${language}\u0000${word.toLowerCase()}`);
}

// AsyncStorage has no transaction primitive. Serialize writes so a slower
// earlier operation cannot finish after and overwrite a newer in-memory state.
let storageWriteQueue: Promise<void> = Promise.resolve();

function persist(key: string, value: string): Promise<void> {
  const write = storageWriteQueue.then(() => AsyncStorage.setItem(key, value));
  storageWriteQueue = write.catch(() => {});
  return write;
}

// Learn display settings kept across app restarts. Not showTranslations, which follows the
// current song's selected translation languages.
const LEARN_SETTINGS = ['fontSize', 'blurTranslations', 'showMasteryLevelColors', 'showIpa', 'showEmoji', 'showSections'] as const;
export type LearnSettings = Pick<AppState, (typeof LEARN_SETTINGS)[number]>;

interface AppState {
  songs: Song[];
  words: WordEntry[];
  ignoredWords: IgnoredWord[];
  compoundSplits: Record<string, string[]>;  // Manual compound word splits, keyed by lowercase word
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
  showIpa: boolean;
  showEmoji: boolean;
  showSections: boolean;
  matchedSongsSearchQuery: string | null;
  matchedSongsCount: number;
  isLoadingSong: boolean;
  autoFetch: AutoFetch | null;

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
  setAutoFetch: (autoFetch: AutoFetch | null) => void;

  // Learn actions
  setFontSize: (size: number) => void;
  toggleTranslations: () => void;
  setSelectedTranslationLanguages: (languages: string[]) => void;
  toggleBlurTranslations: () => void;
  toggleShowMasteryLevelColors: () => void;
  setShowIpa: (show: boolean) => void;
  setShowEmoji: (show: boolean) => void;
  toggleShowSections: () => void;
  loadLearnSettings: () => Promise<void>;

  // Word actions
  loadWords: () => Promise<void>;
  addOrUpdateWord: (
    word: string,
    language: string,
    pronunciation?: string,
    contexts?: WordContext[],
    masteryLevel?: MasteryLevel,
    audio?: WiktionaryAudio[]
  ) => Promise<void>;
  setWordAudio: (id: string, audio: WiktionaryAudio[]) => Promise<void>;
  deleteWord: (id: string) => Promise<void>;

  // Ignore list actions
  loadIgnoredWords: () => Promise<void>;
  toggleIgnoredWord: (word: string, language: string) => Promise<void>;

  // Compound word actions
  loadCompoundSplits: () => Promise<void>;
  setCompoundSplit: (word: string, parts: string[] | null) => Promise<void>;
}

function pickLearnSettings(state: LearnSettings): LearnSettings {
  return Object.fromEntries(LEARN_SETTINGS.map((key) => [key, state[key]])) as unknown as LearnSettings;
}

function setLearnSettings(settings: Partial<LearnSettings>) {
  useStore.setState(settings);
  persist(LEARN_SETTINGS_KEY, JSON.stringify(pickLearnSettings(useStore.getState()))).catch((e) =>
    console.error('Failed to save Learn settings', e)
  );
}

export const useStore = create<AppState>((set, get) => ({
  songs: [],
  words: [],
  ignoredWords: [],
  compoundSplits: {},
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
  showMasteryLevelColors: true,
  showIpa: true,
  showEmoji: true,
  showSections: true,
  matchedSongsSearchQuery: null,
  matchedSongsCount: 0,
  isLoadingSong: false,
  autoFetch: null,

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
        if (JSON.stringify(migratedSongs) !== JSON.stringify(songs)) {
          await persist(SONGS_KEY, JSON.stringify(migratedSongs));
        }
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
    await persist(SONGS_KEY, JSON.stringify(songs));
    return song;
  },

  updateSong: async (id, updates) => {
    const songs = get().songs.map((s) =>
      s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
    );
    set({ songs });
    await persist(SONGS_KEY, JSON.stringify(songs));
  },

  deleteSong: async (id) => {
    const songs = get().songs.filter((s) => s.id !== id);
    set({ songs });
    if (get().currentSongId === id) set({ currentSongId: null });
    await persist(SONGS_KEY, JSON.stringify(songs));
  },

  setCurrentSongId: (id) => set({ currentSongId: id }),

  trackSongOpen: async (id) => {
    const songs = get().songs.map((s) =>
      s.id === id
        ? { ...s, lastOpenedAt: Date.now(), openCount: (s.openCount ?? 0) + 1 }
        : s
    );
    set({ songs });
    await persist(SONGS_KEY, JSON.stringify(songs));
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

  setAutoFetch: (autoFetch) => set({ autoFetch }),

  setFontSize: (size) => setLearnSettings({ fontSize: Math.max(12, Math.min(32, size)) }),

  toggleTranslations: () => set((s) => ({ showTranslations: !s.showTranslations })),

  setSelectedTranslationLanguages: (languages) => set({ selectedTranslationLanguages: languages }),

  toggleBlurTranslations: () => setLearnSettings({ blurTranslations: !get().blurTranslations }),

  toggleShowMasteryLevelColors: () => setLearnSettings({ showMasteryLevelColors: !get().showMasteryLevelColors }),

  setShowIpa: (showIpa) => setLearnSettings({ showIpa }),

  setShowEmoji: (showEmoji) => setLearnSettings({ showEmoji }),

  toggleShowSections: () => setLearnSettings({ showSections: !get().showSections }),

  loadLearnSettings: async () => {
    try {
      const json = await AsyncStorage.getItem(LEARN_SETTINGS_KEY);
      if (!json) return;
      const saved = JSON.parse(json) as Partial<LearnSettings>;
      const defaults = pickLearnSettings(get());
      const settings: Partial<LearnSettings> = {};
      // Skip values of the wrong type, e.g. from an older or corrupted save
      for (const key of LEARN_SETTINGS) {
        if (typeof saved[key] === typeof defaults[key]) Object.assign(settings, { [key]: saved[key] });
      }
      set(settings);
    } catch (e) {
      console.error('Failed to load Learn settings', e);
    }
  },

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
        if (JSON.stringify(migratedWords) !== JSON.stringify(loadedWords)) {
          await persist(WORDS_KEY, JSON.stringify(migratedWords));
        }
      }
    } catch (e) {
      console.error('Failed to load words', e);
    }
  },

  addOrUpdateWord: async (word, language, pronunciation, contexts, masteryLevel, audio) => {
    const existing = get().words.find(
      (w) => w.word.toLowerCase() === word.toLowerCase() && isSameLanguage(w.language, language)
    );
    let words: WordEntry[];
    if (existing) {
      words = get().words.map((w) =>
        w.id === existing.id
          ? {
              ...w,
              lastLookedUp: Date.now(),
              // An editor save is authoritative: removed contexts stay removed,
              // and an explicitly cleared pronunciation stays cleared.
              pronunciation: pronunciation !== undefined ? pronunciation : w.pronunciation,
              contexts: contexts !== undefined
                ? contexts.filter(c => c.context || c.emoji || c.ipa || c.definition)
                : w.contexts,
              masteryLevel: masteryLevel !== undefined ? masteryLevel : w.masteryLevel,
              audio: audio ?? w.audio,
            }
          : w
      );
    } else {
      const entry: WordEntry = {
        id: uuidv4(),
        word,
        language,
        pronunciation: pronunciation ?? '',
        contexts: (contexts ?? []).filter(c => c.context || c.emoji || c.ipa || c.definition),
        lastLookedUp: Date.now(),
        masteryLevel: masteryLevel || 'New',
        audio,
      };
      words = [...get().words, entry];
    }
    set({ words });
    await persist(WORDS_KEY, JSON.stringify(words));
  },

  setWordAudio: async (id, audio) => {
    const words = get().words.map((w) => (w.id === id ? { ...w, audio } : w));
    set({ words });
    await persist(WORDS_KEY, JSON.stringify(words));
  },

  deleteWord: async (id) => {
    const words = get().words.filter((w) => w.id !== id);
    set({ words });
    await persist(WORDS_KEY, JSON.stringify(words));
  },

  loadIgnoredWords: async () => {
    try {
      const json = await AsyncStorage.getItem(IGNORED_WORDS_KEY);
      if (json) set({ ignoredWords: JSON.parse(json) });
    } catch (e) {
      console.error('Failed to load ignored words', e);
    }
  },

  toggleIgnoredWord: async (word, language) => {
    const lower = word.toLowerCase();
    const current = get().ignoredWords;
    const ignoredWords = isWordIgnored(current, lower, language)
      ? current.filter((w) => !(w.word === lower && w.language === language))
      : [...current, { word: lower, language }];
    set({ ignoredWords });
    await persist(IGNORED_WORDS_KEY, JSON.stringify(ignoredWords));
  },

  loadCompoundSplits: async () => {
    try {
      const json = await AsyncStorage.getItem(COMPOUND_SPLITS_KEY);
      if (json) set({ compoundSplits: JSON.parse(json) });
    } catch (e) {
      console.error('Failed to load compound splits', e);
    }
  },

  setCompoundSplit: async (word, parts) => {
    const compoundSplits = { ...get().compoundSplits };
    if (parts) {
      compoundSplits[word.toLowerCase()] = parts;
    } else {
      delete compoundSplits[word.toLowerCase()];
    }
    set({ compoundSplits });
    await persist(COMPOUND_SPLITS_KEY, JSON.stringify(compoundSplits));
  },

}));
