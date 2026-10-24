import { findWordOccurrences } from '../src/utils/wordOccurrences';

describe('findWordOccurrences', () => {
  it('finds whole words only, ignoring case', () => {
    expect(findWordOccurrences('A la, a LA', 'a')).toEqual([[0, 1], [6, 7]]);
    expect(findWordOccurrences('A la, a LA', 'la')).toEqual([[2, 4], [8, 10]]);
  });

  it('counts words with accented edges, which \\b misses', () => {
    expect(findWordOccurrences("L'été, cet été", 'été')).toEqual([[2, 5], [11, 14]]);
  });

  it('finds a word after an elision or next to a hyphen', () => {
    expect(findWordOccurrences("l'amour, mon amour-propre", 'amour')).toEqual([[2, 7], [13, 18]]);
  });

  it('returns nothing for an empty word', () => {
    expect(findWordOccurrences('la la', '')).toEqual([]);
  });
});
