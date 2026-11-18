import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { navigationRef } from '../navigation/navigationRef';
import { useStore } from '../store/useStore';
import { flushWrites } from '../services/storageWrites';

const KEY = '@lyricsionary_ota_resume';
const SCREENS = ['Editor', 'Web', 'Learn', 'Songs', 'Words'];

/** Reloads into a downloaded update, remembering the open song and screen so the app comes back to them */
export async function reloadForUpdate() {
  try {
    const songId = useStore.getState().currentSongId;
    const name = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
    if (songId) {
      const screen = name && SCREENS.includes(name) ? name : 'Learn';
      await AsyncStorage.setItem(KEY, JSON.stringify({ songId, screen }));
    }
    await flushWrites();
  } catch {}
  await Updates.reloadAsync();
}

/** After an update reload, takes the remembered song (once); null on a normal start */
export async function takeOtaResume(): Promise<{ songId: string; screen: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(KEY);
    const { songId, screen } = JSON.parse(raw);
    return typeof songId === 'string' ? { songId, screen: SCREENS.includes(screen) ? screen : 'Learn' } : null;
  } catch {
    return null;
  }
}

/** Opens the remembered song on its screen */
export function applyOtaResume(resume: { songId: string; screen: string }) {
  const { songs, setCurrentSongId } = useStore.getState();
  if (!songs.some((s) => s.id === resume.songId)) return;
  setCurrentSongId(resume.songId);
  const nav = navigationRef as any;
  if (navigationRef.getRootState()?.routeNames.includes('Tabs')) nav.navigate('Tabs', { screen: resume.screen });
  else nav.navigate(resume.screen);
}
