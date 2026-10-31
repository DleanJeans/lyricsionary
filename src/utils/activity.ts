import { localDay } from './wordQuiz';

/** What happened on a day, for the sidebar's progress card */
export interface DayActivity {
  /** New words saved */
  saved?: number;
  /** Quiz answers */
  answers?: number;
  /** Words a quiz moved up a level */
  levelUps?: number;
  /** Songs opened in Learn */
  opened?: number;
}

/** Activity by local day, e.g. "2026-10-31" */
export type ActivityLog = Record<string, DayActivity>;

const KEEP_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The log with the changes added to the day of `now`, keeping the last 60 days */
export function addActivity(log: ActivityLog, changes: DayActivity, now: number): ActivityLog {
  const day = localDay(now);
  const current = log[day] ?? {};
  const updated: DayActivity = { ...current };
  for (const key of Object.keys(changes) as (keyof DayActivity)[]) {
    updated[key] = Math.max(0, (current[key] ?? 0) + (changes[key] ?? 0));
  }
  const oldest = localDay(now - KEEP_DAYS * DAY_MS);
  const next: ActivityLog = {};
  for (const [d, activity] of Object.entries(log)) if (d > oldest) next[d] = activity;
  next[day] = updated;
  return next;
}

const isActive = (activity?: DayActivity) =>
  !!activity && ((activity.saved ?? 0) > 0 || (activity.answers ?? 0) > 0 || (activity.opened ?? 0) > 0);

/**
 * Days in a row with something done, up to today. A streak that reached yesterday still counts
 * while today is young; it ends once a whole day goes by without anything.
 */
export function dayStreak(log: ActivityLog, now: number): number {
  let time = now;
  if (!isActive(log[localDay(time)])) time -= DAY_MS;
  let streak = 0;
  // Noon steps stay on their day across daylight saving changes
  const noon = new Date(time);
  noon.setHours(12, 0, 0, 0);
  for (let t = noon.getTime(); isActive(log[localDay(t)]); t -= DAY_MS) streak++;
  return streak;
}

/** Totals over the last 7 days, today included */
export function weekTotals(log: ActivityLog, now: number): Required<DayActivity> {
  const totals = { saved: 0, answers: 0, levelUps: 0, opened: 0 };
  const noon = new Date(now);
  noon.setHours(12, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const activity = log[localDay(noon.getTime() - i * DAY_MS)];
    if (!activity) continue;
    totals.saved += activity.saved ?? 0;
    totals.answers += activity.answers ?? 0;
    totals.levelUps += activity.levelUps ?? 0;
    totals.opened += activity.opened ?? 0;
  }
  return totals;
}
