import type { MasteryLevel, WordEvent } from '../types';

/** A word keeps its most recent events, enough for its page without growing the saved words without end */
export const MAX_HISTORY = 100;

export const addWordEvent = (history: WordEvent[] | undefined, event: WordEvent): WordEvent[] =>
  [...(history ?? []), event].slice(-MAX_HISTORY);

/** Two words' events as one, e.g. when merging forms, in time order */
export const mergeHistories = (a: WordEvent[] | undefined, b: WordEvent[] | undefined): WordEvent[] | undefined => {
  if (!a?.length && !b?.length) return undefined;
  return [...(a ?? []), ...(b ?? [])].sort((x, y) => x.at - y.at).slice(-MAX_HISTORY);
};

/** The event for a level picked by hand, or none when it didn't change */
export const levelChangeEvent = (before: MasteryLevel | undefined, after: MasteryLevel | undefined, at: number): WordEvent | null =>
  after && after !== (before ?? 'Seen') ? { at, level: after } : null;

export function describeWordEvent(event: WordEvent): string {
  if (event.saved) return `Saved as ${event.level ?? 'Seen'}`;
  if (event.kind) {
    const quiz = event.kind === 'meaning' ? 'Meaning quiz' : 'Lyric quiz';
    const answer = `${quiz}: ${event.correct ? 'right' : 'wrong'}`;
    return event.level ? `${answer}, now ${event.level}` : answer;
  }
  return `Set to ${event.level}`;
}

/** "Today", "Yesterday", "3 days ago" or the date, for the history list */
export function formatEventDay(at: number, now: number): string {
  const startOfDay = (time: number) => {
    const d = new Date(time);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const days = Math.round((startOfDay(now) - startOfDay(at)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: days > 300 ? 'numeric' : undefined });
}
