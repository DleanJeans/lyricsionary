import { Platform } from 'react-native';

/**
 * Service to read currently playing media information from system notifications
 * Currently Android-only, uses notification listener service
 */

export interface MediaInfo {
  songName: string;
  artistName: string;
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

/**
 * Check if notification listener permission is granted
 */
export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const NotificationListener = require('react-native-android-notification-listener').default;
    return await NotificationListener.hasPermission();
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
  if (Platform.OS !== 'android') {
    throw new Error('Notification listener is only available on Android');
  }

  try {
    const NotificationListener = require('react-native-android-notification-listener').default;
    await NotificationListener.requestPermission();
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    throw error;
  }
}

/**
 * Get currently playing media information from notifications.
 * Reads the most recent notification from a known music app.
 */
export async function getCurrentlyPlayingMedia(): Promise<MediaInfo | null> {
  if (Platform.OS !== 'android') {
    throw new Error('Media notification reading is only available on Android');
  }

  const NotificationListener = require('react-native-android-notification-listener').default;

  const hasPermission = await NotificationListener.hasPermission();
  if (!hasPermission) {
    throw new Error('PERMISSION_REQUIRED');
  }

  const notifications: Array<{ app: string; title: string; text: string; time: string }> =
    await NotificationListener.getNotifications();

  // Find the most recent notification from a known media app
  // (getNotifications returns them newest-first)
  for (const notification of notifications) {
    if (MEDIA_APP_PACKAGES.includes(notification.app) && notification.title && notification.text) {
      return {
        songName: notification.title,
        artistName: notification.text,
      };
    }
  }

  return null;
}
