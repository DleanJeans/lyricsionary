import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import type { WordEntry } from '../types';
import { useStore } from '../store/useStore';
import { buildReviewItems, dueWords, type ReviewItem } from '../utils/reviewQuiz';
import { checkTypedAnswer, isTypedQuiz, mustCapitalize, type QuizKind } from '../utils/wordQuiz';
import { allowReviewReminders } from './reviewReminder';

/**
 * A notification that asks one due word, answered from the notification itself: up to 3 option
 * buttons, or a reply box for a word that's typed (Recalled words). The answer counts like a
 * Review answer. Only one is scheduled at a time, the next one after the last was answered or
 * shown. Android and iOS only, see wordQuizNotification.web.ts.
 */

const CHANNEL_ID = 'word-quiz';
const NOTIFICATION_ID = 'word-quiz';
const RESULT_ID = 'word-quiz-result';
const TYPE_ACTION = 'type';
const OPTION_ACTION = 'option-';
/** Android shows 3 action buttons */
const MAX_OPTIONS = 3;
/** Quizzes are sent between these hours of the day */
const FIRST_HOUR = 9;
const LAST_HOUR = 21;

export type QuizNotificationFrequency = 2 | 4 | 8;
export const QUIZ_NOTIFICATION_FREQUENCIES: QuizNotificationFrequency[] = [2, 4, 8];

export interface QuizNotificationSettings {
  on: boolean;
  everyHours: QuizNotificationFrequency;
}

/** What a notification carries to be answered later, without the app having to find its quiz again */
interface QuizData {
  wordId: string;
  kind: QuizKind;
  typed: boolean;
  options: string[];
  answerIndex: number;
}

/** The next time to ask: `everyHours` from now, moved into the daytime window */
export function nextQuizTime(now: number, everyHours: number): number {
  const time = new Date(now + everyHours * 60 * 60 * 1000);
  if (time.getHours() >= LAST_HOUR) {
    time.setDate(time.getDate() + 1);
    time.setHours(FIRST_HOUR, 0, 0, 0);
  } else if (time.getHours() < FIRST_HOUR) {
    time.setHours(FIRST_HOUR, 0, 0, 0);
  }
  return time.getTime();
}

/** The line with the word blanked out, or the word's meaning question when it has no line */
function questionFor(item: ReviewItem, typed: boolean): string {
  if (item.kind === 'meaning' || !item.line || !item.wordAt) return `What does "${item.entry.word}" mean?`;
  const gapped = `${item.line.slice(0, item.wordAt.start)}_____${item.line.slice(item.wordAt.end)}`;
  return `${typed ? 'Type the missing word' : 'Which word is missing?'}\n${gapped}${item.hint ? `\n${item.hint}` : ''}`;
}

/** The first due word that fits in a notification: a meaning or lyric quiz, with no audio, IPA or speaking */
function pickItem(words: WordEntry[], now: number): ReviewItem | null {
  const songs = useStore.getState().songs;
  const due = dueWords(words, now);
  if (!due.length) return null;
  // Shuffle so the same words don't come first every time
  const shuffled = [...due].sort(() => Math.random() - 0.5).slice(0, 40);
  const items = buildReviewItems(shuffled, words, Math.random, new Map(), songs);
  return items.find((i) => !i.listen && !i.ipa && i.way !== 'speak' && (i.quiz.options.length >= 2 || isTypedQuiz(i.entry.masteryLevel, i.kind))) ?? null;
}

/** The 3 options to show: the right one and two others, in random order */
function threeOptions(options: string[], answerIndex: number): { options: string[]; answerIndex: number } {
  const answer = options[answerIndex];
  const others = options.filter((_, i) => i !== answerIndex).sort(() => Math.random() - 0.5).slice(0, MAX_OPTIONS - 1);
  const shown = [...others, answer].sort(() => Math.random() - 0.5);
  return { options: shown, answerIndex: shown.indexOf(answer) };
}

async function ensureChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Word quiz',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Replaces the scheduled quiz with one for the next time, or none when it's off or nothing's due */
export async function scheduleWordQuiz(words: WordEntry[], settings: QuizNotificationSettings, now = Date.now()): Promise<void> {
  try {
    if (!settings.on) {
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
      return;
    }
    const time = nextQuizTime(now, settings.everyHours);
    const item = pickItem(words, time);
    if (!item) {
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
      return;
    }
    const typed = isTypedQuiz(item.entry.masteryLevel, item.kind);
    const shown = typed ? { options: [], answerIndex: 0 } : threeOptions(item.quiz.options, item.quiz.answerIndex);
    // Each quiz has its own category, since a category holds the button titles
    const category = `word-quiz-${item.entry.id}`;
    await Notifications.setNotificationCategoryAsync(
      category,
      typed
        ? [{ identifier: TYPE_ACTION, buttonTitle: 'Answer', options: { opensAppToForeground: false }, textInput: { submitButtonTitle: 'Send', placeholder: 'Type the word' } }]
        : shown.options.map((text, i) => ({ identifier: `${OPTION_ACTION}${i}`, buttonTitle: text, options: { opensAppToForeground: false } }))
    );
    await ensureChannel();
    const data: QuizData = { wordId: item.entry.id, kind: item.kind, typed, ...shown };
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: { title: 'Quick word', body: questionFor(item, typed), categoryIdentifier: category, data: data as unknown as Record<string, unknown> },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: time, channelId: CHANNEL_ID },
    });
  } catch (error) {
    console.error('Failed to schedule the word quiz:', error);
  }
}

/** Keeps one quiz scheduled: it's only chosen when none is, so a word doesn't change on every save */
export function useWordQuizSchedule(words: WordEntry[], settings: QuizNotificationSettings, ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(async () => {
      try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        if (settings.on && scheduled.some((n) => n.identifier === NOTIFICATION_ID)) return;
      } catch {
        // Schedule anyway
      }
      void scheduleWordQuiz(words, settings);
    }, 3000);
    return () => clearTimeout(timer);
  }, [words, settings.on, settings.everyHours, ready]);
}

/** Asks to post notifications, true when allowed */
export const allowWordQuizzes = allowReviewReminders;

/**
 * Answers the quiz from a button or the reply box, shows whether it was right in the same
 * notification, and schedules the next one. Tapping the notification itself calls onOpen.
 */
export function useWordQuizResponse(ready: boolean, onOpen: () => void): void {
  const response = Notifications.useLastNotificationResponse();
  const handledRef = useRef<number | null>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!ready || !response || response.notification.request.identifier !== NOTIFICATION_ID) return;
    const tappedAt = response.notification.date;
    if (handledRef.current === tappedAt) return;
    handledRef.current = tappedAt;
    Notifications.clearLastNotificationResponse();
    const action = response.actionIdentifier;
    const data = response.notification.request.content.data as unknown as QuizData;
    const isOption = action.startsWith(OPTION_ACTION);
    const isTyped = action === TYPE_ACTION && 'userText' in response;
    if (!isOption && !isTyped) return onOpenRef.current();
    void (async () => {
      const store = useStore.getState();
      const entry = store.words.find((w) => w.id === data.wordId);
      if (!entry) return;
      let correct: boolean;
      let shownAnswer: string;
      if (isTyped) {
        const typed = (response as { userText?: string }).userText ?? '';
        const result = checkTypedAnswer(typed, entry.word, mustCapitalize(entry));
        correct = result === 'right' || result === 'accents';
        shownAnswer = entry.word;
      } else {
        const index = Number(action.slice(OPTION_ACTION.length));
        correct = index === data.answerIndex;
        shownAnswer = data.options[data.answerIndex];
      }
      await store.recordQuizAnswer(entry.id, data.kind, correct);
      try {
        await ensureChannel();
        await Notifications.scheduleNotificationAsync({
          identifier: RESULT_ID,
          content: {
            title: correct ? 'Correct' : 'Not quite',
            body: data.kind === 'meaning' ? `${entry.word} means ${shownAnswer}` : shownAnswer,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: CHANNEL_ID },
        });
        await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
      } catch (error) {
        console.error('Failed to show the word quiz result:', error);
      }
      const { wordQuizNotification, words } = useStore.getState();
      await scheduleWordQuiz(words, wordQuizNotification);
    })();
  }, [response, ready]);
}
