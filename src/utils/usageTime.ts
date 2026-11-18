import { localDay } from './wordQuiz';

/** Milliseconds in the app by local day, e.g. "2026-11-18" */
export type UsageLog = Record<string, number>;

const KEEP_DAYS = 30;

const nextMidnight = (time: number) => {
  const date = new Date(time);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
};

/** The log with the time from `start` to `end` added, split at each local midnight, keeping the last 30 days */
export function addUsage(log: UsageLog, start: number, end: number): UsageLog {
  const next: UsageLog = { ...log };
  let from = start;
  while (from < end) {
    const to = Math.min(end, nextMidnight(from));
    const day = localDay(from);
    next[day] = (next[day] ?? 0) + (to - from);
    from = to;
  }
  const oldest = new Date(end);
  oldest.setDate(oldest.getDate() - KEEP_DAYS);
  const cutoff = localDay(oldest.getTime());
  for (const day of Object.keys(next)) if (day <= cutoff) delete next[day];
  return next;
}

/** Time in the app today and over the last 7 days including today */
export function usageTotals(log: UsageLog, now: number): { today: number; week: number } {
  const date = new Date(now);
  let week = 0;
  for (let i = 0; i < 7; i++) {
    week += log[localDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() - i, 12).getTime())] ?? 0;
  }
  return { today: log[localDay(now)] ?? 0, week };
}

/** "1h 23m", "45m", or "<1m" */
export function formatUsage(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return ms > 0 ? '<1m' : '0m';
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}
