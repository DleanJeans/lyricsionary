import { addWordEvent, describeWordEvent, formatEventDay, levelChangeEvent, MAX_HISTORY, mergeHistories } from '../src/utils/wordHistory';

describe('word history', () => {
  it('keeps the most recent events', () => {
    let history = undefined as ReturnType<typeof addWordEvent> | undefined;
    for (let i = 0; i < MAX_HISTORY + 5; i++) history = addWordEvent(history, { at: i, kind: 'meaning', correct: true });
    expect(history).toHaveLength(MAX_HISTORY);
    expect(history![0].at).toBe(5);
  });

  it('merges two histories in time order', () => {
    expect(mergeHistories([{ at: 3 }], [{ at: 1 }, { at: 5 }])!.map((e) => e.at)).toEqual([1, 3, 5]);
    expect(mergeHistories(undefined, [])).toBeUndefined();
  });

  it('only notes a level picked by hand when it changed', () => {
    expect(levelChangeEvent('Seen', 'Seen', 1)).toBeNull();
    expect(levelChangeEvent(undefined, undefined, 1)).toBeNull();
    expect(levelChangeEvent(undefined, 'Known', 1)).toEqual({ at: 1, level: 'Known' });
  });

  it('describes each kind of event', () => {
    expect(describeWordEvent({ at: 0, saved: true, level: 'Seen' })).toBe('Saved as Seen');
    expect(describeWordEvent({ at: 0, kind: 'lyric', correct: false })).toBe('Lyric quiz: wrong');
    expect(describeWordEvent({ at: 0, kind: 'meaning', correct: true, level: 'Recognized' })).toBe('Meaning quiz: right, now Recognized');
    expect(describeWordEvent({ at: 0, level: 'Known' })).toBe('Set to Known');
  });

  it('says how long ago a day was', () => {
    const now = new Date(2026, 9, 31, 12).getTime();
    expect(formatEventDay(now - 1000, now)).toBe('Today');
    expect(formatEventDay(new Date(2026, 9, 30, 23).getTime(), now)).toBe('Yesterday');
    expect(formatEventDay(new Date(2026, 9, 27, 9).getTime(), now)).toBe('4 days ago');
  });
});
