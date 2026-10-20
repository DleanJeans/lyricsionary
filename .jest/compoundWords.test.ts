import { getCompoundParts, isGermanLanguage, parseManualSplit, splitCompound } from '../src/utils/compoundWords';

const known = new Set(['liebe', 'brief', 'hand', 'schuh', 'haus', 'tür', 'arbeit', 'zimmer', 'kinder', 'garten']);

describe('splitCompound', () => {
  it('splits a two-part compound', () => {
    expect(splitCompound('Handschuh', known)).toEqual([
      { text: 'Hand', lemma: 'hand', lookup: 'Hand' },
      { text: 'schuh', lemma: 'schuh', lookup: 'Schuh' },
    ]);
  });

  it('handles a linking element', () => {
    expect(splitCompound('Liebesbrief', known)).toEqual([
      { text: 'Liebes', lemma: 'liebe', lookup: 'Liebe' },
      { text: 'brief', lemma: 'brief', lookup: 'Brief' },
    ]);
  });

  it('splits three parts', () => {
    expect(splitCompound('Arbeitszimmertür', known)?.map((p) => p.text)).toEqual(['Arbeits', 'zimmer', 'tür']);
  });

  it('prefers the fewest parts', () => {
    expect(splitCompound('Kindergarten', new Set([...known, 'kind', 'ergarten']))?.map((p) => p.text)).toEqual([
      'Kinder',
      'garten',
    ]);
  });

  it('returns null for known words', () => {
    expect(splitCompound('Liebe', known)).toBeNull();
  });

  it('returns null when parts are unknown', () => {
    expect(splitCompound('Fernseher', known)).toBeNull();
  });
});

describe('parseManualSplit', () => {
  it('parses hyphens and spaces', () => {
    expect(parseManualSplit('Fernseher', 'Fern-seher')).toEqual(['Fern', 'seher']);
    expect(parseManualSplit('Fernseher', 'fern seher')).toEqual(['fern', 'seher']);
  });

  it('rejects splits that do not spell the word', () => {
    expect(parseManualSplit('Fernseher', 'Fern-sehen')).toBeNull();
    expect(parseManualSplit('Fernseher', 'Fernseher')).toBeNull();
  });
});

describe('getCompoundParts', () => {
  it('prefers manual splits', () => {
    expect(getCompoundParts('Fernseher', { fernseher: ['fern', 'seher'] }, known)?.map((p) => p.text)).toEqual([
      'Fern',
      'seher',
    ]);
  });

  it('falls back to automatic split', () => {
    expect(getCompoundParts('Haustür', {}, known)?.map((p) => p.text)).toEqual(['Haus', 'tür']);
  });
});

describe('lookup spelling', () => {
  it('uses the saved spelling when known', () => {
    const saved = new Map([['liebe', 'Liebe'], ['brief', 'Brief']]);
    expect(splitCompound('Liebesbrief', saved)?.map((p) => p.lookup)).toEqual(['Liebe', 'Brief']);
  });

  it('capitalizes parts of a capitalized word', () => {
    expect(getCompoundParts('Fernseher', { fernseher: ['fern', 'seher'] }, known)?.map((p) => p.lookup)).toEqual([
      'Fern',
      'Seher',
    ]);
  });

  it('keeps parts of a lowercase word lowercase', () => {
    expect(getCompoundParts('wunderschön', { wunderschön: ['wunder', 'schön'] }, known)?.map((p) => p.lookup)).toEqual([
      'wunder',
      'schön',
    ]);
  });
});

describe('isGermanLanguage', () => {
  it('detects German', () => {
    expect(isGermanLanguage(['German'])).toBe(true);
    expect(isGermanLanguage(['de'])).toBe(true);
    expect(isGermanLanguage(['French'])).toBe(false);
    expect(isGermanLanguage(undefined)).toBe(false);
  });
});
