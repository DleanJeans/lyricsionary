/**
 * Web platform stub for the word quiz notification: notifications are only scheduled on the phone
 */

import type { WordEntry } from '../types';

export type QuizNotificationFrequency = 2 | 4 | 8;
export const QUIZ_NOTIFICATION_FREQUENCIES: QuizNotificationFrequency[] = [2, 4, 8];

export interface QuizNotificationSettings {
  on: boolean;
  everyHours: QuizNotificationFrequency;
}

export async function allowWordQuizzes(): Promise<boolean> {
  return false;
}

export async function scheduleWordQuiz(_words: WordEntry[], _settings: QuizNotificationSettings, _now?: number): Promise<void> {}

export function useWordQuizSchedule(_words: WordEntry[], _settings: QuizNotificationSettings, _ready: boolean): void {}

export function useWordQuizResponse(_ready: boolean, _onOpen: () => void): void {}
