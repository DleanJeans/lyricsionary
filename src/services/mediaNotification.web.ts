/**
 * Web platform stub for media notification service
 * Media notification reading is only available on Android
 */

export interface MediaInfo {
  songName: string;
  artistName: string;
}

export async function hasNotificationPermission(): Promise<boolean> {
  return false;
}

export async function requestNotificationPermission(): Promise<void> {
  throw new Error('Notification listener is only available on Android');
}

export async function getCurrentlyPlayingMedia(): Promise<MediaInfo | null> {
  throw new Error('Media notification reading is only available on Android');
}
