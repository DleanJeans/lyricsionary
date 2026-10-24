import { findSearchMatches, matchesSearch } from '../src/utils/search';

const matched = (text: string, query: string) => findSearchMatches(text, query).map(([s, e]) => text.slice(s, e));

describe('search', () => {
  it('ignores case and accents', () => {
    expect(matchesSearch('Mi Corazón', 'corazon')).toBe(true);
    expect(matchesSearch('Mi corazon', 'CORAZÓN')).toBe(true);
    expect(matchesSearch('Mi corazón', 'amor')).toBe(false);
    expect(matchesSearch(undefined, 'amor')).toBe(false);
  });

  it('folds ligatures', () => {
    expect(matchesSearch('Mon cœur', 'coeur')).toBe(true);
    expect(matchesSearch('Straße', 'strasse')).toBe(true);
  });

  it('maps matches back to the original text', () => {
    expect(matched('Mi Corazón, corazón', 'corazon')).toEqual(['Corazón', 'corazón']);
    expect(matched('Mon cœur', 'coe')).toEqual(['cœ']);
    expect(matched('Mon cœur', 'oeur')).toEqual(['œur']);
    expect(matched('abc', '')).toEqual([]);
  });
});
