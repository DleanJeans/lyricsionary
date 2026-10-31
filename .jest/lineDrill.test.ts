import { lineDrillPieces, shufflePieces } from '../src/utils/lineDrill';

describe('lineDrillPieces', () => {
  it('splits a line into its words, punctuation kept', () => {
    expect(lineDrillPieces("  Je veux de l'amour, de la joie ")).toEqual(['Je', 'veux', 'de', "l'amour,", 'de', 'la', 'joie']);
  });

  it('splits a line without spaces into characters', () => {
    expect(lineDrillPieces('夜に駆ける')).toEqual(['夜', 'に', '駆', 'け', 'る']);
  });
});

describe('shufflePieces', () => {
  it("isn't the line's order", () => {
    const pieces = ['a', 'b', 'c'];
    for (let i = 0; i < 20; i++) {
      const order = shufflePieces(pieces);
      expect([...order].sort()).toEqual([0, 1, 2]);
      expect(order.map((o) => pieces[o])).not.toEqual(pieces);
    }
  });

  it('gives up on a line of one repeated word', () => {
    expect(shufflePieces(['la', 'la']).length).toBe(2);
  });
});
