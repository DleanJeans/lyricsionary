import type { WordEntry } from '../types';
import { isDue } from './wordQuiz';

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
