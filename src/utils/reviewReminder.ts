import type { WordEntry } from '../types';
import { dayStreak, isActive, type ActivityLog } from './activity';
import { isDue, localDay } from './wordQuiz';

/** The local hour the review reminder comes at */
export const REMINDER_HOUR = 19;

/** The next reminder time: today at 7 PM, or tomorrow's once that has passed */
export function nextReminderTime(now: number, hour = REMINDER_HOUR): number {
  const time = new Date(now);
  time.setHours(hour, 0, 0, 0);
  if (time.getTime() <= now) time.setDate(time.getDate() + 1);
  return time.getTime();
}

/** How many words will be due at that time, e.g. ones cooling down now that will have cooled off */
export const dueCountAt = (words: WordEntry[], time: number) => words.filter((w) => isDue(w, time)).length;

export const reminderBody = (count: number) =>
  `${count} ${count === 1 ? 'word is' : 'words are'} due. A quick review keeps your streak going.`;

/** The local hour of the streak saver, after the review reminder */
export const STREAK_SAVER_HOUR = 21;

/**
 * When to remind about a streak at risk: tonight at 9 PM while today has nothing done yet and the
 * streak reached yesterday, or tomorrow at 9 PM once today counts (cancelled again when tomorrow
 * gets something done). Null when there's no streak to save.
 */
export function streakSaverTime(log: ActivityLog, now: number): number | null {
  if (dayStreak(log, now) === 0) return null;
  const tonight = new Date(now);
  tonight.setHours(STREAK_SAVER_HOUR, 0, 0, 0);
  if (isActive(log[localDay(now)])) {
    const tomorrow = new Date(tonight);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getTime();
  }
  return tonight.getTime() > now ? tonight.getTime() : null;
}

export const streakSaverBody = (streak: number) =>
  `Your ${streak}-day streak ends at midnight. One quick review keeps it going.`;
