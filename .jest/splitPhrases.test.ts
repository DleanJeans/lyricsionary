import { splitLyricTokens } from '../src/utils/cleanLyrics';
import {
  findSplitPhrases, germanSeparableVerb, joinLineWords, phraseLookupWords, phraseOccurrenceAt,
} from '../src/utils/splitPhrases';

jest.mock('../src/utils/wiktionary', () => ({
  getWiktionaryLemmas: async (word: string) => ({ hört: ['hören'], steh: ['stehen'] } as Record<string, string[]>)[word] ?? [],
}));

const tokens = splitLyricTokens;
const verbAt = (line: string, word: string) => {
  const t = tokens(line);
  return germanSeparableVerb(t, t.indexOf(word))?.phrase ?? null;
};

describe('germanSeparableVerb', () => {
  it('finds the particle ending the clause of a verb in first or second place', () => {
    expect(verbAt('Wann hört all dieser Schmerz auf?', 'hört')).toBe('hört … auf');
    expect(verbAt('Hört der Schmerz auf?', 'Hört')).toBe('Hört … auf');
    expect(verbAt('und dann hört er auf', 'hört')).toBe('hört … auf');
    expect(verbAt('Steh auf, mach mit', 'Steh')).toBe('Steh auf');
  });

  it('leaves words later in the clause, and clauses without a particle, alone', () => {
    expect(verbAt('Wann hört all dieser Schmerz auf?', 'dieser')).toBeNull();
    expect(verbAt('Ich höre, du gehst', 'höre')).toBeNull();
    expect(verbAt('Ich höre, du gehst auf', 'höre')).toBeNull();
    expect(verbAt('Wann hört all dieser Schmerz auf?', 'auf')).toBeNull();
  });
});

describe('findSplitPhrases', () => {
  it('finds each part in order within a clause', () => {
    expect(findSplitPhrases(tokens('Wann hört all dieser Schmerz auf?'), ['hört … auf'])).toEqual([
      { phrase: 'hört … auf', occurrence: 1, indices: [2, 10] },
    ]);
    const hits = findSplitPhrases(tokens('hört er auf, hört sie auf'), ['hört … auf']);
    expect(hits.map((h) => h.occurrence)).toEqual([1, 2]);
    expect(findSplitPhrases(tokens('ich hört, er auf'), ['hört … auf'])).toEqual([]);
  });
});

describe('phraseOccurrenceAt', () => {
  it('counts the ones starting before', () => {
    const line = 'hört er auf, hört sie auf';
    expect(phraseOccurrenceAt(line, 'hört … auf', 0)).toBe(1);
    expect(phraseOccurrenceAt(line, 'hört … auf', 13)).toBe(2);
    expect(phraseOccurrenceAt('give up, give up', 'give up', 9)).toBe(2);
  });
});

describe('joinLineWords', () => {
  it('joins words next to each other with spaces, apart with an ellipsis', () => {
    expect(joinLineWords([{ word: 'hört', index: 0 }, { word: 'auf', index: 4 }])).toBe('hört … auf');
    expect(joinLineWords([{ word: 'give', index: 1 }, { word: 'up', index: 2 }])).toBe('give up');
  });
});

describe('phraseLookupWords', () => {
  it('looks a German verb up with its particle, and other phrases joined', async () => {
    expect(await phraseLookupWords('hört … auf', 'German', true)).toEqual(['hört auf', 'aufhören', 'aufhört']);
    expect(await phraseLookupWords('Steh auf', 'German', true)).toEqual(['aufstehen', 'aufsteh']);
    expect(await phraseLookupWords('turn … off', 'English', false)).toEqual(['turn off']);
  });
});
