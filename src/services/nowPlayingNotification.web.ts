/**
 * Web platform stub for now playing notifications
 * Media notification reading is only available on Android
 */

import { MediaInfo } from './mediaNotification';

export interface NowPlayingRequest extends Omit<MediaInfo, 'receivedAt'> {
  requestedAt: number;
}

export async function setupNowPlayingNotifications(): Promise<void> {}

export async function notifyNowPlaying(_info: MediaInfo): Promise<void> {}

export function useNowPlayingResponse(_onRequest: (request: NowPlayingRequest) => void): void {}
