import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '../store/useStore';
import { addLanguageUsage, addUsage, languageTotals, usageTotals, type LanguageUsageLog, type UsageLog } from '../utils/usageTime';

// Per install, so it's left out of exports and imports (see DEVICE_ONLY_KEYS in backup.ts)
export const USAGE_KEY = '@lyricsionary_usage_time';
export const LANGUAGE_USAGE_KEY = '@lyricsionary_usage_languages';
const SAVE_EVERY_MS = 60_000;
const TICK_MS = 5_000;
/** A language only counts while the screen was touched in the last minute */
const IDLE_AFTER_MS = 60_000;

let log: UsageLog = {};
let loaded: Promise<void> | null = null;
/** When the app became active; null while it's in the background */
let activeSince: number | null = null;

let languageLog: LanguageUsageLog = {};
let languageDirty = false;
/** The language being studied: the open song's, the review's or the looked up word's */
let studyLanguage: string | null = null;
let lastTouch = 0;
let lastTick = 0;

export function setStudyLanguage(language: string | null | undefined) {
  if (language) studyLanguage = language;
}

/** Called on every touch: only stores the time, so nothing re-renders */
export function markTouched() {
  lastTouch = Date.now();
}

const load = () =>
  (loaded ??= Promise.all([AsyncStorage.getItem(USAGE_KEY), AsyncStorage.getItem(LANGUAGE_USAGE_KEY)])
    .then(([raw, rawLanguages]) => {
      const saved = raw ? (JSON.parse(raw) as UsageLog) : {};
      // Anything counted before the load finished is kept
      for (const [day, ms] of Object.entries(saved)) if (typeof ms === 'number') log[day] = Math.max(log[day] ?? 0, ms);
      const savedLanguages = rawLanguages ? (JSON.parse(rawLanguages) as LanguageUsageLog) : {};
      for (const [day, languages] of Object.entries(savedLanguages)) {
        for (const [language, ms] of Object.entries(languages ?? {})) {
          const current = (languageLog[day] ??= {});
          if (typeof ms === 'number') current[language] = Math.max(current[language] ?? 0, ms);
        }
      }
    })
    .catch(() => {}));

/** Adds the time since the last tick to the language being studied, when the screen was touched lately */
function tickLanguage() {
  const now = Date.now();
  const elapsed = now - lastTick;
  lastTick = now;
  if (activeSince === null || !studyLanguage || now - lastTouch > IDLE_AFTER_MS) return;
  languageLog = addLanguageUsage(languageLog, studyLanguage, Math.min(elapsed, TICK_MS * 2), now);
  languageDirty = true;
}

/** Moves the time since the app went active into the log and saves it */
async function flush(keepCounting: boolean) {
  const now = Date.now();
  if (activeSince !== null) {
    log = addUsage(log, activeSince, now);
    activeSince = keepCounting ? now : null;
  }
  await load();
  await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(log)).catch(() => {});
  if (languageDirty) {
    languageDirty = false;
    await AsyncStorage.setItem(LANGUAGE_USAGE_KEY, JSON.stringify(languageLog)).catch(() => {});
  }
}

/** Counts the time the app is in the foreground; saved every minute and when it goes to the background */
export function useUsageTracker() {
  useEffect(() => {
    void load();
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') activeSince ??= Date.now();
      else void flush(false);
    };
    if (AppState.currentState === 'active') activeSince ??= Date.now();
    const subscription = AppState.addEventListener('change', onChange);
    const timer = setInterval(() => {
      if (activeSince !== null) void flush(true);
    }, SAVE_EVERY_MS);
    // Opening a song makes its language the one being studied
    const setFromSong = (id: string | null) => {
      if (!id) return;
      setStudyLanguage(useStore.getState().songs.find((s) => s.id === id)?.originalLanguages?.[0]);
    };
    setFromSong(useStore.getState().currentSongId);
    const unsubscribe = useStore.subscribe((state, prev) => {
      if (state.currentSongId !== prev.currentSongId) setFromSong(state.currentSongId);
    });
    lastTick = Date.now();
    const languageTimer = setInterval(tickLanguage, TICK_MS);
    return () => {
      subscription.remove();
      unsubscribe();
      clearInterval(timer);
      clearInterval(languageTimer);
    };
  }, []);
}

/** Time in the app today and over the last 7 days, including the stretch still running */
export function useUsageTime() {
  const read = () => usageTotals(activeSince !== null ? addUsage(log, activeSince, Date.now()) : log, Date.now());
  const [totals, setTotals] = useState(read);
  useEffect(() => {
    let alive = true;
    void load().then(() => alive && setTotals(read()));
    const timer = setInterval(() => setTotals(read()), 15_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return totals;
}

/** Time per language today and over the last 7 days, the most time first */
export function useLanguageUsage() {
  const [totals, setTotals] = useState(() => languageTotals(languageLog, Date.now()));
  useEffect(() => {
    let alive = true;
    void load().then(() => alive && setTotals(languageTotals(languageLog, Date.now())));
    const timer = setInterval(() => setTotals(languageTotals(languageLog, Date.now())), 15_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return totals;
}
