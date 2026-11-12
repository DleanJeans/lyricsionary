import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { GOOGLE_SEARCH_URL } from '../constants/urls';
import { persist } from '../services/storageWrites';
import { MASTERY_LEVELS, MasteryLevel, Song, toMasteryLevel, Translation, WordContext, WordEntry } from '../types';
import type { WiktionaryAudio } from '../utils/wiktionary';
import { localDay, QuizKind, recordAnswer } from '../utils/wordQuiz';
import { ActivityLog, addActivity, DayActivity } from '../utils/activity';
import { findSavedWord, mergeWordEntries, splitForm } from '../utils/wordForms';
import { addWordEvent, levelChangeEvent } from '../utils/wordHistory';

const SONGS_KEY = '@lyricsionary_songs';
const WORDS_KEY = '@lyricsionary_words';
const IGNORED_WORDS_KEY = '@lyricsionary_ignored_words';
const COMPOUND_SPLITS_KEY = '@lyricsionary_compound_splits';
const LEARN_SETTINGS_KEY = '@lyricsionary_learn_settings';
const ACTIVITY_KEY = '@lyricsionary_activity';
const REVIEW_REMINDER_KEY = '@lyricsionary_review_reminder';

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

// Learn display settings kept across app restarts. Not showTranslations, which follows the
// current song's selected translation languages.
const LEARN_SETTINGS = ['fontSize', 'blurTranslations', 'showMasteryLevelColors', 'showIpa', 'showIpaBrackets', 'showEmoji', 'showSections', 'reverseLyrics', 'wideWordSpacing', 'highlightNewWords', 'quietKnownWords'] as const;
export type LearnSettings = Pick<AppState, (typeof LEARN_SETTINGS)[number]>;

interface AppState {
  songs: Song[];
  words: WordEntry[];
  ignoredWords: IgnoredWord[];
  compoundSplits: Record<string, string[]>;  // Manual compound word splits, keyed by lowercase word
  currentSongId: string | null;
  webUrl: string;
  scrapeTargetTab: number;
  scrapeTargetLanguage: string | null;  // The target translation tab's language, null for the original
  editorFilledTabs: number[];  // The Editor's tabs with lyrics (0 the original), which Web doesn't fill on its own
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
  showIpaBrackets: boolean;  // Slashes or brackets around the IPA above words
  showEmoji: boolean;
  showSections: boolean;
  /** Learn shows the translation and blurs the original, to recall it from the meaning */
  reverseLyrics: boolean;
  /** More room between Learn's words, for easier tapping on a phone */
  wideWordSpacing: boolean;
  /** Learn dims saved words and shows the new ones bright, instead of level colors */
  highlightNewWords: boolean;
  /** Known words drop their IPA and emoji, which they no longer need */
  quietKnownWords: boolean;
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
  setScrapeTargetTab: (tab: number, language?: string | null) => void;
  setEditorFilledTabs: (tabs: number[]) => void;
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
  toggleShowIpaBrackets: () => void;
  setShowEmoji: (show: boolean) => void;
  toggleShowSections: () => void;
  toggleReverseLyrics: () => void;
  toggleWideWordSpacing: () => void;
  toggleHighlightNewWords: () => void;
  toggleQuietKnownWords: () => void;
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
  /** Bulk edit in Words: many words at once */
  deleteWords: (ids: string[]) => Promise<void>;
  setWordsLevel: (ids: string[], level: MasteryLevel) => Promise<void>;
  /** Merges a form saved apart into a word, e.g. voulez into veux, keeping its contexts and quiz answers */
  mergeWords: (keepId: string, fromId: string) => Promise<void>;
  /** Splits a merged form back out as its own word, with the contexts whose line has it */
  unmergeForm: (id: string, form: string) => Promise<void>;
  /** Puts a deleted word back as it was, e.g. on Undo */
  restoreWord: (entry: WordEntry) => Promise<void>;
  /** Changes saved word fields without counting it as a look up, e.g. a word type found later */
  updateWordEntry: (id: string, changes: Partial<Omit<WordEntry, 'id'>>) => Promise<void>;
  /** Saves a word quiz answer, moving the word up a level when it has enough; returns the word before */
  recordQuizAnswer: (id: string, kind: QuizKind, correct: boolean) => Promise<WordEntry | undefined>;
  /** What was done each day, for the sidebar's progress card */
  activity: ActivityLog;
  loadActivity: () => Promise<void>;
  recordActivity: (changes: DayActivity) => Promise<void>;
  /** A 7 PM notification when words are due */
  reviewReminder: boolean;
  setReviewReminder: (on: boolean) => Promise<void>;
  /** Signed in to Spotify, for seeking it by lyric line in Learn */
  spotifyConnected: boolean;
  setSpotifyConnected: (connected: boolean) => void;

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
  persist(LEARN_SETTINGS_KEY, () => JSON.stringify(pickLearnSettings(useStore.getState()))).catch((e) =>
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
  scrapeTargetLanguage: null,
  editorFilledTabs: [],
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
  showIpaBrackets: true,
  showEmoji: true,
  showSections: true,
  reverseLyrics: false,
  wideWordSpacing: false,
  highlightNewWords: false,
  quietKnownWords: true,
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
          await persist(SONGS_KEY, () => JSON.stringify(migratedSongs));
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
    await persist(SONGS_KEY, () => JSON.stringify(songs));
    return song;
  },

  updateSong: async (id, updates) => {
    const songs = get().songs.map((s) =>
      s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
    );
    set({ songs });
    await persist(SONGS_KEY, () => JSON.stringify(songs));
  },

  deleteSong: async (id) => {
    const songs = get().songs.filter((s) => s.id !== id);
    set({ songs });
    if (get().currentSongId === id) set({ currentSongId: null });
    await persist(SONGS_KEY, () => JSON.stringify(songs));
  },

  setCurrentSongId: (id) => set({ currentSongId: id }),

  trackSongOpen: async (id) => {
    const songs = get().songs.map((s) =>
      s.id === id
        ? { ...s, lastOpenedAt: Date.now(), openCount: (s.openCount ?? 0) + 1 }
        : s
    );
    set({ songs });
    await persist(SONGS_KEY, () => JSON.stringify(songs));
    await get().recordActivity({ opened: 1 });
  },

  setMatchedSongs: (searchQuery, count) => set({ matchedSongsSearchQuery: searchQuery, matchedSongsCount: count }),

  setIsLoadingSong: (isLoading) => set({ isLoadingSong: isLoading }),

  setWebUrl: (url) => set({ webUrl: url }),
  setScrapeTargetTab: (tab, language = null) => set({ scrapeTargetTab: tab, scrapeTargetLanguage: language }),
  setEditorFilledTabs: (tabs) => set({ editorFilledTabs: tabs }),
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

  toggleShowIpaBrackets: () => setLearnSettings({ showIpaBrackets: !get().showIpaBrackets }),

  setShowEmoji: (showEmoji) => setLearnSettings({ showEmoji }),

  toggleShowSections: () => setLearnSettings({ showSections: !get().showSections }),

  toggleReverseLyrics: () => setLearnSettings({ reverseLyrics: !get().reverseLyrics }),

  toggleWideWordSpacing: () => setLearnSettings({ wideWordSpacing: !get().wideWordSpacing }),
  toggleHighlightNewWords: () => setLearnSettings({ highlightNewWords: !get().highlightNewWords }),
  toggleQuietKnownWords: () => setLearnSettings({ quietKnownWords: !get().quietKnownWords }),

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
        // Migrate old words that don't have definitions array or masteryLevel, or have an old level
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
            // Also renames the old levels, e.g. Mastered -> Known
            masteryLevel: toMasteryLevel(w.masteryLevel),
          };
        });
        set({ words: migratedWords });
        if (JSON.stringify(migratedWords) !== JSON.stringify(loadedWords)) {
          await persist(WORDS_KEY, () => JSON.stringify(migratedWords));
        }
      }
    } catch (e) {
      console.error('Failed to load words', e);
    }
  },

  addOrUpdateWord: async (word, language, pronunciation, contexts, masteryLevel, audio) => {
    const existing = findSavedWord(get().words, word, language);
    let words: WordEntry[];
    const levelChange = existing ? levelChangeEvent(existing.masteryLevel, masteryLevel, Date.now()) : null;
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
              history: levelChange ? addWordEvent(w.history, levelChange) : w.history,
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
        savedAt: Date.now(),
        masteryLevel: masteryLevel || 'Seen',
        history: [{ at: Date.now(), level: masteryLevel || 'Seen', saved: true }],
        audio,
      };
      words = [...get().words, entry];
    }
    set({ words });
    await persist(WORDS_KEY, () => JSON.stringify(words));
    if (!existing) await get().recordActivity({ saved: 1 });
  },

  setWordAudio: async (id, audio) => {
    const words = get().words.map((w) => (w.id === id ? { ...w, audio } : w));
    set({ words });
    await persist(WORDS_KEY, () => JSON.stringify(words));
  },

  updateWordEntry: async (id, changes) => {
    if (!get().words.some((w) => w.id === id)) return;
    const words = get().words.map((w) => (w.id === id ? { ...w, ...changes } : w));
    set({ words });
    await persist(WORDS_KEY, () => JSON.stringify(words));
  },

  recordQuizAnswer: async (id, kind, correct) => {
    const before = get().words.find((w) => w.id === id);
    if (!before) return undefined;
    const now = Date.now();
    const after = recordAnswer(before.masteryLevel, before.quiz, kind, correct, now);
    const changed = after.masteryLevel !== (before.masteryLevel ?? 'Seen');
    const history = addWordEvent(before.history, { at: now, kind, correct, ...(changed ? { level: after.masteryLevel } : {}) });
    await get().updateWordEntry(id, { ...after, history });
    const levelUp = MASTERY_LEVELS.indexOf(after.masteryLevel) > MASTERY_LEVELS.indexOf(before.masteryLevel ?? 'Seen');
    await get().recordActivity(levelUp ? { answers: 1, levelUps: 1 } : { answers: 1 });
    return before;
  },

  activity: {},

  loadActivity: async () => {
    try {
      const [json, reminder] = await Promise.all([AsyncStorage.getItem(ACTIVITY_KEY), AsyncStorage.getItem(REVIEW_REMINDER_KEY)]);
      if (json) set({ activity: JSON.parse(json) });
      if (reminder) set({ reviewReminder: JSON.parse(reminder) === true });
    } catch (e) {
      console.error('Failed to load activity', e);
    }
  },

  reviewReminder: false,

  spotifyConnected: false,
  setSpotifyConnected: (connected) => set({ spotifyConnected: connected }),

  setReviewReminder: async (on) => {
    set({ reviewReminder: on });
    await persist(REVIEW_REMINDER_KEY, () => JSON.stringify(on));
  },

  recordActivity: async (changes) => {
    const activity = addActivity(get().activity, changes, Date.now());
    set({ activity });
    await persist(ACTIVITY_KEY, () => JSON.stringify(activity));
  },

  deleteWord: async (id) => {
    const deleted = get().words.find((w) => w.id === id);
    const words = get().words.filter((w) => w.id !== id);
    set({ words });
    await persist(WORDS_KEY, () => JSON.stringify(words));
    // A word saved and removed the same day, e.g. replaced by a phrase grown from it, wasn't learned
    if (deleted?.savedAt && localDay(deleted.savedAt) === localDay(Date.now())) await get().recordActivity({ saved: -1 });
  },

  deleteWords: async (ids) => {
    const remove = new Set(ids);
    const today = localDay(Date.now());
    const savedToday = get().words.filter((w) => remove.has(w.id) && w.savedAt && localDay(w.savedAt) === today).length;
    const words = get().words.filter((w) => !remove.has(w.id));
    set({ words });
    await persist(WORDS_KEY, () => JSON.stringify(words));
    if (savedToday) await get().recordActivity({ saved: -savedToday });
  },

  setWordsLevel: async (ids, level) => {
    const change = new Set(ids);
    const now = Date.now();
    const words = get().words.map((w) => {
      if (!change.has(w.id)) return w;
      const event = levelChangeEvent(w.masteryLevel, level, now);
      return event ? { ...w, masteryLevel: level, history: addWordEvent(w.history, event) } : w;
    });
    set({ words });
    await persist(WORDS_KEY, () => JSON.stringify(words));
  },

  mergeWords: async (keepId, fromId) => {
    const keep = get().words.find((w) => w.id === keepId);
    const from = get().words.find((w) => w.id === fromId);
    if (!keep || !from || keepId === fromId) return;
    const merged = mergeWordEntries(keep, from);
    const words = get().words.filter((w) => w.id !== fromId).map((w) => (w.id === keepId ? merged : w));
    set({ words });
    await persist(WORDS_KEY, () => JSON.stringify(words));
  },

  unmergeForm: async (id, form) => {
    const entry = get().words.find((w) => w.id === id);
    if (!entry?.forms?.includes(form)) return;
    const [kept, split] = splitForm(entry, form, uuidv4(), Date.now());
    const words = [...get().words.map((w) => (w.id === id ? kept : w)), split];
    set({ words });
    await persist(WORDS_KEY, () => JSON.stringify(words));
  },

  restoreWord: async (entry) => {
    if (get().words.some((w) => w.id === entry.id)) return;
    const words = [...get().words, entry];
    set({ words });
    await persist(WORDS_KEY, () => JSON.stringify(words));
    if (entry.savedAt && localDay(entry.savedAt) === localDay(Date.now())) await get().recordActivity({ saved: 1 });
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
    await persist(IGNORED_WORDS_KEY, () => JSON.stringify(ignoredWords));
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
    await persist(COMPOUND_SPLITS_KEY, () => JSON.stringify(compoundSplits));
  },

}));
