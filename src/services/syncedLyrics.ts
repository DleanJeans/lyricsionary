import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Song } from '../types';

/** Synced (LRC) lyrics from LRCLIB, kept per song; an empty string remembers that none were found */

const CACHE_KEY = '@lyricsionary_synced_lyrics';

async function readCache(): Promise<Record<string, string>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(CACHE_KEY)) ?? '{}');
  } catch {
    return {};
  }
}

async function fetchLrclib(path: string): Promise<unknown> {
  const response = await fetch(`https://lrclib.net/api${path}`, { headers: { 'Lrclib-Client': 'Lyricsionary' } });
  return response.ok ? response.json() : null;
}

/** The song's synced lyrics, from the cache or LRCLIB; null when LRCLIB has none */
export async function getSyncedLyrics(song: Song, durationMs?: number): Promise<string | null> {
  const cache = await readCache();
  if (song.id in cache) return cache[song.id] || null;
  const params = new URLSearchParams({ track_name: song.songName, artist_name: song.artistName ?? '' });
  if (durationMs) params.set('duration', String(Math.round(durationMs / 1000)));
  let lrc: string | null = null;
  try {
    const exact = (await fetchLrclib(`/get?${params.toString()}`)) as { syncedLyrics?: string } | null;
    lrc = exact?.syncedLyrics || null;
    if (!lrc) {
      const results = (await fetchLrclib(
        `/search?${new URLSearchParams({ track_name: song.songName, artist_name: song.artistName ?? '' }).toString()}`
      )) as { syncedLyrics?: string }[] | null;
      lrc = results?.find((r) => r.syncedLyrics)?.syncedLyrics ?? null;
    }
  } catch {
    // Offline: try again next time instead of remembering none
    return null;
  }
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ...(await readCache()), [song.id]: lrc ?? '' }));
  return lrc;
}

/** Forgets the song's synced lyrics, e.g. to look again after LRCLIB adds them */
export async function forgetSyncedLyrics(songId: string): Promise<void> {
  const cache = await readCache();
  delete cache[songId];
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}
