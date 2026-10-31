import { findWordSpots, stepWordSpot } from '../src/utils/wordLines';

const none = () => false;

describe('findWordSpots', () => {
  it('finds every time the word comes up, numbered per line', () => {
    const lines = ['Je veux, je veux', '', 'Tu veux?', 'Rien'];
    expect(findWordSpots(lines, 'veux', none)).toEqual([
      { lineIndex: 0, occurrence: 1 },
      { lineIndex: 0, occurrence: 2 },
      { lineIndex: 2, occurrence: 1 },
    ]);
  });

  it('ignores case and punctuation', () => {
    expect(findWordSpots(['Amour!', '(amour)'], 'amour', none)).toHaveLength(2);
  });

  it('finds a phrase written apart', () => {
    const lines = ['never give up', 'give it up'];
    expect(findWordSpots(lines, 'give up', none)).toEqual([{ lineIndex: 0, occurrence: 1 }]);
  });
});

describe('stepWordSpot', () => {
  const spots = [
    { lineIndex: 0, occurrence: 1 },
    { lineIndex: 3, occurrence: 1 },
  ];
  it('wraps around the song', () => {
    expect(stepWordSpot(spots, spots[1], 1)).toEqual(spots[0]);
    expect(stepWordSpot(spots, spots[0], -1)).toEqual(spots[1]);
  });
  it('starts at an end when nothing is selected', () => {
    expect(stepWordSpot(spots, null, 1)).toEqual(spots[0]);
    expect(stepWordSpot([], null, 1)).toBeNull();
  });
});
