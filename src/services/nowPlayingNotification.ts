import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Song, WordEntry } from '../types';
import { songDueWords, SONG_REVIEW_SIZE } from '../utils/reviewQuiz';
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
const WORDS_KEY = '@lyricsionary_words';
// One category per count, since a button's title is fixed: "Review 5 words"
const categoryFor = (count: number) => `now-playing-review-${count}`;
export const REVIEW_ACTION_ID = 'review-song';

export interface NowPlayingRequest extends Omit<MediaInfo, 'receivedAt'> {
  requestedAt: number;
  /** The "Review" button was tapped: start a review of the song's due words */
  review?: boolean;
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

async function registerReviewCategory(count: number): Promise<void> {
  await Notifications.setNotificationCategoryAsync(categoryFor(count), [
    { identifier: REVIEW_ACTION_ID, buttonTitle: `Review ${count} ${count === 1 ? 'word' : 'words'}`, options: { opensAppToForeground: true } },
  ]);
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
  const saved = findSavedSong(songs, info.songName, info.artistName);
  const isSaved = !!saved;
  // A "Review N words" button when the saved song has words due
  let dueCount = 0;
  if (saved) {
    try {
      const wordsJson = await AsyncStorage.getItem(WORDS_KEY);
      const words: WordEntry[] = wordsJson ? JSON.parse(wordsJson) : [];
      dueCount = Math.min(songDueWords(saved.id, words).length, SONG_REVIEW_SIZE);
      if (dueCount) await registerReviewCategory(dueCount);
    } catch (error) {
      console.error('Failed to count the song\'s due words:', error);
    }
  }

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: `${info.songName} · ${info.artistName}`,
      body: isSaved ? 'Tap to open in Learn' : 'Tap to get lyrics and translation',
      data: { songName: info.songName, artistName: info.artistName, dueCount },
      categoryIdentifier: dueCount ? categoryFor(dueCount) : undefined,
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
    const review = response.actionIdentifier === REVIEW_ACTION_ID;
    onRequestRef.current({ songName, artistName: artistName ?? '', requestedAt, review });
  }, [response]);
}
