import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import type { WordEntry } from '../types';
import { dueCountAt, nextReminderTime, reminderBody } from '../utils/reviewReminder';

/**
 * A daily evening notification when saved words are due for review. It's scheduled for one day at
 * a time with that day's count, and scheduled again as words change. Android and iOS only, see
 * reviewReminder.web.ts.
 */

const CHANNEL_ID = 'review-reminder';
// Reusing one identifier replaces the reminder scheduled before
const NOTIFICATION_ID = 'review-reminder';


/** Asks to post notifications, true when allowed */
export async function allowReviewReminders(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch (error) {
    console.error('Failed to ask for notifications:', error);
    return false;
  }
}

/** Replaces the scheduled reminder with one for the next 7 PM, or none when it's off or nothing's due */
export async function scheduleReviewReminder(words: WordEntry[], enabled: boolean, now = Date.now()): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
    if (!enabled) return;
    const time = nextReminderTime(now);
    const count = dueCountAt(words, time);
    if (count === 0) return;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Review reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: { title: 'Time to review', body: reminderBody(count) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: time, channelId: CHANNEL_ID },
    });
  } catch (error) {
    console.error('Failed to schedule the review reminder:', error);
  }
}

/** Keeps the reminder scheduled as words are saved and quizzed, a moment after the last change */
export function useReviewReminderSchedule(words: WordEntry[], enabled: boolean, ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => void scheduleReviewReminder(words, enabled), 2000);
    return () => clearTimeout(timer);
  }, [words, enabled, ready]);
}

/** Calls onOpen once for each tap on the reminder, including the one that launched the app */
export function useReviewReminderResponse(onOpen: () => void): void {
  const response = Notifications.useLastNotificationResponse();
  const handledRef = useRef<number | null>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!response || response.notification.request.identifier !== NOTIFICATION_ID) return;
    const tappedAt = response.notification.date;
    if (handledRef.current === tappedAt) return;
    handledRef.current = tappedAt;
    Notifications.clearLastNotificationResponse();
    onOpenRef.current();
  }, [response]);
}
