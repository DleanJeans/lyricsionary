import { addActivity, dayStreak, weekTotals } from '../src/utils/activity';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date(2026, 9, 31, 9).getTime();

describe('activity', () => {
  it('adds to the day and forgets days over 60 old', () => {
    let log = addActivity({ '2026-08-01': { saved: 3 } }, { saved: 1 }, now);
    log = addActivity(log, { saved: 1, answers: 2 }, now);
    expect(log).toEqual({ '2026-10-31': { saved: 2, answers: 2 } });
  });

  it('never goes below zero, e.g. undoing a level up', () => {
    expect(addActivity({}, { levelUps: -1 }, now)['2026-10-31']).toEqual({ levelUps: 0 });
  });

  it('counts days in a row, still alive in the morning before anything is done', () => {
    let log = {};
    for (const daysAgo of [1, 2, 3, 5]) log = addActivity(log, { opened: 1 }, now - daysAgo * DAY);
    expect(dayStreak(log, now)).toBe(3);
    log = addActivity(log, { answers: 1 }, now);
    expect(dayStreak(log, now)).toBe(4);
    expect(dayStreak(log, now + 2 * DAY)).toBe(0);
  });

  it("doesn't count a day with only a level up undone", () => {
    expect(dayStreak({ '2026-10-31': { levelUps: 0 } }, now)).toBe(0);
  });

  it('sums the last 7 days', () => {
    let log = addActivity({}, { saved: 2, levelUps: 1 }, now);
    log = addActivity(log, { saved: 3 }, now - 6 * DAY);
    log = addActivity(log, { saved: 10 }, now - 7 * DAY);
    expect(weekTotals(log, now)).toEqual({ saved: 5, answers: 0, levelUps: 1, opened: 0 });
  });
});
