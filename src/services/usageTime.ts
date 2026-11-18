import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addUsage, usageTotals, type UsageLog } from '../utils/usageTime';

// Per install, so it's left out of exports and imports (see DEVICE_ONLY_KEYS in backup.ts)
export const USAGE_KEY = '@lyricsionary_usage_time';
const SAVE_EVERY_MS = 60_000;

let log: UsageLog = {};
let loaded: Promise<void> | null = null;
/** When the app became active; null while it's in the background */
let activeSince: number | null = null;

const load = () =>
  (loaded ??= AsyncStorage.getItem(USAGE_KEY)
    .then((raw) => {
      const saved = raw ? (JSON.parse(raw) as UsageLog) : {};
      // Anything counted before the load finished is kept
      for (const [day, ms] of Object.entries(saved)) if (typeof ms === 'number') log[day] = Math.max(log[day] ?? 0, ms);
    })
    .catch(() => {}));

/** Moves the time since the app went active into the log and saves it */
async function flush(keepCounting: boolean) {
  const now = Date.now();
  if (activeSince !== null) {
    log = addUsage(log, activeSince, now);
    activeSince = keepCounting ? now : null;
  }
  await load();
  await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(log)).catch(() => {});
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
    return () => {
      subscription.remove();
      clearInterval(timer);
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
