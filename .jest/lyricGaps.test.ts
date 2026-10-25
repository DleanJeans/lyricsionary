import type { MasteryLevel, WordEntry } from '../src/types';
import { canFillGaps, countGaps, gapWord, songWordIndex } from '../src/utils/lyricGaps';

const now = new Date(2026, 9, 25, 12).getTime();
const saved = (word: string, masteryLevel: MasteryLevel, language = 'German', lastAnsweredAt?: number): WordEntry => ({
  id: word,
  word,
  language,
  pronunciation: '',
  contexts: [],
  lastLookedUp: 0,
  masteryLevel,
  quiz: lastAnsweredAt === undefined ? undefined : { streak: 0, correct: 0, wrong: 0, lastAnsweredAt },
});

describe('lyric gaps', () => {
  const index = songWordIndex(
    [saved('Herz', 'Recognized'), saved('Liebe', 'Recalled'), saved('immer', 'Seen'), saved('fragen', 'Recognized', 'German', now - 1000), saved('heart', 'Recognized', 'English')],
    ['de']
  );

  it("counts each Recognized or Recalled word of the song's language once, not one just quizzed", () => {
    expect(canFillGaps(index)).toBe(true);
    expect(countGaps('Mein Herz, mein herz! Liebe immer fragen heart', (w) => gapWord(index, w, now))).toBe(2);
  });

  it('needs 3 saved words in the language', () => {
    expect(canFillGaps(songWordIndex([saved('Herz', 'Recognized'), saved('heart', 'Recognized', 'English')], ['de']))).toBe(false);
  });
});
