import AsyncStorage from '@react-native-async-storage/async-storage';

/** Where Learn was scrolled to in each song, so opening it again goes back there */

const KEY = '@lyricsionary_scroll_positions';
let cache: Record<string, number> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function getScrollPosition(songId: string): Promise<number> {
  if (!cache) {
    try {
      cache = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}');
    } catch {
      cache = {};
    }
  }
  return cache![songId] ?? 0;
}

/** Remembers the position, written to storage a moment after scrolling stops */
export function setScrollPosition(songId: string, y: number): void {
  cache = { ...(cache ?? {}), [songId]: Math.max(0, Math.round(y)) };
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void AsyncStorage.setItem(KEY, JSON.stringify(cache)), 500);
}
