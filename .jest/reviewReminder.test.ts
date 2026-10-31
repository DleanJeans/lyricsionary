import type { WordEntry } from '../src/types';
import { dueCountAt, nextReminderTime, reminderBody } from '../src/utils/reviewReminder';

const at = (day: number, hour: number) => new Date(2026, 9, day, hour).getTime();

describe('review reminder', () => {
  it('comes at 7 PM today, or tomorrow once it has passed', () => {
    expect(nextReminderTime(at(31, 9))).toBe(at(31, 19));
    expect(nextReminderTime(at(31, 19))).toBe(new Date(2026, 10, 1, 19).getTime());
  });

  it('counts the words due then, including ones cooling down now', () => {
    const word = (quiz?: WordEntry['quiz']): WordEntry => ({ id: '1', word: 'a', language: 'fr', pronunciation: '', contexts: [], lastLookedUp: 0, quiz });
    const words = [word(), word({ streak: 1, correct: 1, wrong: 0, lastAnsweredAt: at(31, 17) }), { ...word(), masteryLevel: 'Known' as const }];
    expect(dueCountAt(words, at(31, 18))).toBe(1);
    expect(dueCountAt(words, at(31, 19) + 2 * 3600e3)).toBe(2);
  });

  it('says how many', () => {
    expect(reminderBody(1)).toMatch(/^1 word is due/);
    expect(reminderBody(3)).toMatch(/^3 words are due/);
  });
});
