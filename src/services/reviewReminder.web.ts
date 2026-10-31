/**
 * Web platform stub for the review reminder: notifications are only scheduled on the phone
 */

import type { WordEntry } from '../types';

export async function allowReviewReminders(): Promise<boolean> {
  return false;
}

export async function scheduleReviewReminder(_words: WordEntry[], _enabled: boolean, _now?: number): Promise<void> {}

export function useReviewReminderSchedule(_words: WordEntry[], _enabled: boolean, _ready: boolean): void {}

import type { ActivityLog } from '../utils/activity';

export async function scheduleStreakSaver(_log: ActivityLog, _enabled: boolean, _now?: number): Promise<void> {}

export function useStreakSaverSchedule(_log: ActivityLog, _enabled: boolean, _ready: boolean): void {}

export function useReviewReminderResponse(_onOpen: () => void): void {}
