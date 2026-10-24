import { LANGUAGES, getFlagForLanguage, getLanguageNameFromCode, findLanguageName, isRtlLanguage, isSameLanguage, searchLanguages } from '../src/constants/languages';

describe('languages', () => {
  it('has unique codes and names', () => {
    expect(new Set(LANGUAGES.map((l) => l.code)).size).toBe(LANGUAGES.length);
    expect(new Set(LANGUAGES.map((l) => l.name)).size).toBe(LANGUAGES.length);
  });

  it('includes Catalan', () => {
    expect(getLanguageNameFromCode('ca')).toBe('Catalan');
    expect(getFlagForLanguage('Catalan')).toBe('🇦🇩');
  });

  it('reads codes with a region and language names', () => {
    expect(getLanguageNameFromCode('pt-BR')).toBe('Portuguese');
    expect(getLanguageNameFromCode('es_419')).toBe('Spanish');
    expect(getLanguageNameFromCode('FR')).toBe('French');
    expect(getLanguageNameFromCode('german')).toBe('German');
    expect(getLanguageNameFromCode('xx')).toBeNull();
  });
});

describe('searchLanguages', () => {
  const names = (query: string) => searchLanguages(LANGUAGES, query).map((l) => l.name);

  it('matches the start of a name or word, or a code', () => {
    expect(names('cat')).toEqual(['Catalan']);
    expect(names('ca')).toContain('Catalan');
    expect(names('creole')).toEqual(['Haitian Creole']);
    expect(names('el')).toEqual(['Greek']);
    expect(names('  GER ')).toEqual(['German']);
  });

  it('returns every language for an empty query', () => {
    expect(names('')).toHaveLength(LANGUAGES.length);
  });

  it('ignores accents', () => {
    expect(searchLanguages([{ code: 'nb', name: 'Norwegian Bokmål' }], 'bokmal')).toHaveLength(1);
  });
});

describe('findLanguageName', () => {
  it('finds the language a label names', () => {
    expect(findLanguageName('English translation')).toBe('English');
    expect(findLanguageName('Mon amour (Haitian Creole translation)')).toBe('Haitian Creole');
    expect(findLanguageName('de')).toBe('German');
    expect(findLanguageName('Englishman')).toBeNull();
    expect(findLanguageName('')).toBeNull();
  });
});

describe('isRtlLanguage', () => {
  it('knows right-to-left languages by name or code', () => {
    expect(isRtlLanguage('Arabic')).toBe(true);
    expect(isRtlLanguage('he')).toBe(true);
    expect(isRtlLanguage('French')).toBe(false);
  });
});

describe('isSameLanguage', () => {
  it('matches a language given as a name or a code', () => {
    expect(isSameLanguage('fr', 'French')).toBe(true);
    expect(isSameLanguage('pt-BR', 'portuguese')).toBe(true);
    expect(isSameLanguage('French', 'German')).toBe(false);
    expect(isSameLanguage('unknown', 'unknown')).toBe(true);
  });
});
