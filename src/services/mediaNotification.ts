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
    const { NotificationListenerModule } = require('react-native-nitro-notification-listener');
    return await NotificationListenerModule.hasPermission();
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
    const { NotificationListenerModule } = require('react-native-nitro-notification-listener');
    await NotificationListenerModule.requestPermission();
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    throw error;
  }
}

/**
 * Get currently playing media information from notifications
 * Returns the most recent media notification from known music apps
 */
export async function getCurrentlyPlayingMedia(): Promise<MediaInfo | null> {
  if (Platform.OS !== 'android') {
    throw new Error('Media notification reading is only available on Android');
  }

  try {
    const { NotificationListenerModule } = require('react-native-nitro-notification-listener');

    // Check if we have permission
    const hasPermission = await NotificationListenerModule.hasPermission();
    if (!hasPermission) {
      throw new Error('PERMISSION_REQUIRED');
    }

    // Start the listener if not already started
    try {
      await NotificationListenerModule.start();
    } catch (error) {
      // Listener may already be running, that's fine
      console.log('Listener may already be running:', error);
    }

    // For now, we'll return a mock implementation since the library
    // doesn't provide a way to query current notifications synchronously
    // In a real implementation, we'd need to:
    // 1. Listen to notifications continuously in the background
    // 2. Store the latest media notification in local state
    // 3. Return the stored value when requested

    return null;
  } catch (error) {
    console.error('Error getting currently playing media:', error);
    throw error;
  }
}

/**
 * Start listening to notifications in the background
 * Stores the latest media notification for quick retrieval
 */
let latestMediaInfo: MediaInfo | null = null;
let listenerStarted = false;

export async function startMediaListener(): Promise<void> {
  if (Platform.OS !== 'android' || listenerStarted) {
    return;
  }

  try {
    const { NotificationListenerModule } = require('react-native-nitro-notification-listener');

    // Check permission
    const hasPermission = await NotificationListenerModule.hasPermission();
    if (!hasPermission) {
      return;
    }

    // Start listening
    await NotificationListenerModule.start();
    listenerStarted = true;

    // Listen for notifications
    NotificationListenerModule.addListener((event: any) => {
      // Check if this is from a known media app
      if (MEDIA_APP_PACKAGES.includes(event.packageName)) {
        // Extract song and artist from notification
        // Typically: title = song name, text = artist name
        if (event.title && event.text) {
          latestMediaInfo = {
            songName: event.title,
            artistName: event.text,
          };
          console.log('Updated media info:', latestMediaInfo);
        }
      }
    });
  } catch (error) {
    console.error('Error starting media listener:', error);
  }
}

/**
 * Get the latest media information from the background listener
 */
export function getLatestMediaInfo(): MediaInfo | null {
  return latestMediaInfo;
}

/**
 * Check if this is a media-related package
 */
export function isMediaApp(packageName: string): boolean {
  return MEDIA_APP_PACKAGES.includes(packageName);
}
