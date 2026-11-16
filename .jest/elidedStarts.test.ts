import { findWordSpots } from '../src/utils/wordLines';
import { splitElisionParts } from '../src/utils/wordTransform';

const starts = (cleaned: string) => (splitElisionParts(cleaned) ?? []).slice(0, -1);

describe('findWordSpots with elided starts', () => {
  const lines = ["J'ai peur, j'ai froid", "Il n'est pas là, n'est-ce pas", "J’aime l'amour"];
  it('finds j\' on its own at every word starting with it', () => {
    expect(findWordSpots(lines, "j'", () => false, starts)).toEqual([
      { lineIndex: 0, occurrence: 1 },
      { lineIndex: 0, occurrence: 2 },
      { lineIndex: 2, occurrence: 1 },
    ]);
  });
  it("finds n' and l' apart", () => {
    expect(findWordSpots(lines, "n'", () => false, starts)).toEqual([
      { lineIndex: 1, occurrence: 1 },
      { lineIndex: 1, occurrence: 2 },
    ]);
    expect(findWordSpots(lines, "l'", () => false, starts)).toEqual([{ lineIndex: 2, occurrence: 1 }]);
  });
  it('counts a start in several parts, j\'t\'aime', () => {
    expect(findWordSpots(["j't'aime"], "t'", () => false, starts)).toEqual([{ lineIndex: 0, occurrence: 1 }]);
  });
  it('leaves words as they were without the starts', () => {
    expect(findWordSpots(lines, "j'", () => false)).toEqual([]);
    expect(findWordSpots(lines, "j'ai", () => false)).toHaveLength(2);
  });
});
