import { isSameTrack, lineAtTime, lineSimilarity, matchSyncedLines, parseLrc, stepLine } from '../src/utils/syncedLyrics';

describe('parseLrc', () => {
  it('reads timed lines, skipping empty ones and tags', () => {
    expect(parseLrc('[ar:Zaz]\n[00:01.50] Je veux\n[00:03.00]\n[01:02.345]De l’amour')).toEqual([
      { timeMs: 1500, text: 'Je veux' },
      { timeMs: 62345, text: 'De l’amour' },
    ]);
  });

  it('gives a line with two stamps both times', () => {
    expect(parseLrc('[00:10.00][00:40.00]La la').map((l) => l.timeMs)).toEqual([10000, 40000]);
  });
});

describe('matchSyncedLines', () => {
  const synced = parseLrc(
    ['[00:05.00] Donnez-moi une suite au Ritz', '[00:10.00] Je veux de l\'amour, de la joie', '[00:20.00] Je veux de l\'amour, de la joie', '[00:25.00] Une ligne en plus'].join('\n')
  );

  it('lines up repeated lines in order, blank lines without a time', () => {
    const song = ['Donnez-moi une suite au Ritz!', '', "Je veux de l'amour, de la joie", "Je veux de l'amour de la joie"];
    expect(matchSyncedLines(song, synced)).toEqual([5000, null, 10000, 20000]);
  });

  it('leaves a line the synced lyrics lack without a time', () => {
    expect(matchSyncedLines(['Something else entirely', 'Une ligne en plus'], synced)).toEqual([null, 25000]);
  });

  it('compares lines without spaces by character', () => {
    expect(lineSimilarity('夜に駆ける', '夜に駆ける！')).toBe(1);
  });
});

describe('lineAtTime and stepLine', () => {
  const times = [5000, null, 10000, 20000];
  it('finds the line playing', () => {
    expect(lineAtTime(times, 4000)).toBeNull();
    expect(lineAtTime(times, 12000)).toBe(2);
    expect(lineAtTime(times, 99000)).toBe(3);
  });

  it('steps over lines without a time', () => {
    expect(stepLine(times, 0, 1)).toBe(2);
    expect(stepLine(times, 2, -1)).toBe(0);
    expect(stepLine(times, 3, 1)).toBeNull();
  });
});

describe('isSameTrack', () => {
  it('matches loosely', () => {
    expect(isSameTrack('Je veux', 'Zaz', 'Je veux - Live', 'ZAZ')).toBe(true);
    expect(isSameTrack('99 Luftballons', 'Nena', '99 Luftballons (Remastered)', 'Nena')).toBe(true);
    expect(isSameTrack('Je veux', 'Zaz', 'Les passants', 'Zaz')).toBe(false);
  });
});
