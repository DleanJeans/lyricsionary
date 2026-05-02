import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Service to read currently playing media information from system notifications
 * Currently Android-only, uses notification listener service
 */

export interface MediaInfo {
  songName: string;
  artistName: string;
}

// Import the native module once at the top
// Wrap in try-catch to handle cases where module isn't available
let NotificationListener: any = null;
try {
  if (Platform.OS === 'android') {
    NotificationListener = require('react-native-android-notification-listener').default;
  }
} catch (error) {
  console.warn('react-native-android-notification-listener not available:', error);
}

// Known media app package names
const MEDIA_APP_PACKAGES = [
  'com.spotify.music',
  'com.google.android.youtube',
  'com.google.android.apps.youtube.music',
  'com.amazon.mp3',
  'com.apple.android.music',
  'deezer.android.app',
  'com.soundcloud.android',
  'com.aspiro.tidal',
  'com.pandora.android',
];

const LAST_MEDIA_KEY = '@lyricsionary_last_media';

/**
 * Called from the headless task handler in index.ts when a notification arrives.
 * Persists to AsyncStorage so the main app JS context can read it.
 */
export async function handleNotificationEvent(notification: {
  app: string;
  title: string;
  text: string;
  time: string;
}): Promise<void> {
  if (MEDIA_APP_PACKAGES.includes(notification.app) && notification.title && notification.text) {
    const info: MediaInfo = {
      songName: notification.title,
      artistName: notification.text,
    };
    await AsyncStorage.setItem(LAST_MEDIA_KEY, JSON.stringify(info));
  }
}

function isAvailable(): boolean {
  return (
    Platform.OS === 'android' &&
    !!NotificationListener &&
    typeof NotificationListener.getPermissionStatus === 'function'
  );
}

/**
 * Check if notification listener permission is granted.
 * The native module returns "authorized" or "denied".
 */
export async function hasNotificationPermission(): Promise<boolean> {
  if (!isAvailable()) {
    console.error('NotificationListener module not available');
    return false;
  }

  try {
    const status = await NotificationListener.getPermissionStatus();
    return status === 'authorized';
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
}

/**
 * Request notification listener permission
 * Opens Android settings where user must manually enable the permission
 */
export async function requestNotificationPermission(): Promise<void> {
  if (Platform.OS !== "android") {
    throw new Error("Notification listener is only available on Android");
  }

  if (!isAvailable()) {
    throw new Error('NotificationListener module not available');
  }

  try {
    await NotificationListener.requestPermission();
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    throw error;
  }
}

/**
 * Get currently playing media information.
 * Returns the last media notification received by the background headless task listener.
 * Play something in a music app first — the library captures it when the notification fires.
 */
export async function getCurrentlyPlayingMedia(): Promise<MediaInfo | null> {
  if (Platform.OS !== 'android') {
    throw new Error('Media notification reading is only available on Android');
  }

  if (!isAvailable()) {
    throw new Error('NotificationListener module not available');
  }

  const status = await NotificationListener.getPermissionStatus();
  if (status !== 'authorized') {
    throw new Error('PERMISSION_REQUIRED');
  }

  const raw = await AsyncStorage.getItem(LAST_MEDIA_KEY);
  return raw ? (JSON.parse(raw) as MediaInfo) : null;
}
