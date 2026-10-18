import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Song } from '../types';
import { findSavedSong } from '../utils/nowPlaying';
import { hasNotificationPermission, MediaInfo } from './mediaNotification';

/**
 * Posts a notification when a new song starts playing on Spotify.
 * Tapping it opens the saved song in Learn, or fetches lyrics and translation.
 */

const CHANNEL_ID = 'now-playing';
// Reusing one identifier replaces the previous song's notification
const NOTIFICATION_ID = 'now-playing';
const LAST_NOTIFIED_KEY = '@lyricsionary_last_notified_media';
const SONGS_KEY = '@lyricsionary_songs';

export interface NowPlayingRequest extends MediaInfo {
  requestedAt: number;
}

export async function setupNowPlayingNotifications(): Promise<void> {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Now Playing',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    // Only ask to post notifications once the user has turned on now-playing detection
    if (await hasNotificationPermission()) {
      const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
      if (!granted && canAskAgain) await Notifications.requestPermissionsAsync();
    }
  } catch (error) {
    console.error('Failed to set up now playing notifications:', error);
  }
}

/**
 * Called from the headless notification listener when Spotify posts a media notification.
 */
export async function notifyNowPlaying(info: MediaInfo): Promise<void> {
  const key = `${info.songName}\u0000${info.artistName}`;
  if ((await AsyncStorage.getItem(LAST_NOTIFIED_KEY)) === key) return;
  await AsyncStorage.setItem(LAST_NOTIFIED_KEY, key);

  const songsJson = await AsyncStorage.getItem(SONGS_KEY);
  const songs: Song[] = songsJson ? JSON.parse(songsJson) : [];
  const isSaved = !!findSavedSong(songs, info.songName, info.artistName);

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: `${info.songName} · ${info.artistName}`,
      body: isSaved ? 'Tap to open in Learn' : 'Tap to get lyrics and translation',
      data: { songName: info.songName, artistName: info.artistName },
    },
    trigger: { channelId: CHANNEL_ID },
  });
}

/**
 * Calls onRequest once for each now playing notification the user taps,
 * including the one that launched the app.
 */
export function useNowPlayingResponse(onRequest: (request: NowPlayingRequest) => void): void {
  const response = Notifications.useLastNotificationResponse();
  const handledRef = useRef<number | null>(null);
  const onRequestRef = useRef(onRequest);
  onRequestRef.current = onRequest;

  useEffect(() => {
    if (!response || response.notification.request.identifier !== NOTIFICATION_ID) return;
    const { songName, artistName } = response.notification.request.content.data as Partial<MediaInfo>;
    const requestedAt = response.notification.date;
    if (!songName || handledRef.current === requestedAt) return;
    handledRef.current = requestedAt;
    Notifications.clearLastNotificationResponse();
    onRequestRef.current({ songName, artistName: artistName ?? '', requestedAt });
  }, [response]);
}
