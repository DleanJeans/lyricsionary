import { LANGUAGES, ROMANIZED, findTranslationLanguageName, getFlagForLanguage, getLanguageNameFromCode, findLanguageName, isMostlyLatin, isRtlLanguage, isSameLanguage, languageKey, searchLanguages, translationLanguagesFor } from '../src/constants/languages';

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

describe('languageKey', () => {
  it('is the same for a name and its code', () => {
    expect(languageKey('fr')).toBe('french');
    expect(languageKey('French')).toBe('french');
    expect(languageKey('Klingon')).toBe('klingon');
  });
});

describe('Romanized', () => {
  it('is offered first for a song not in the Latin alphabet', () => {
    expect(translationLanguagesFor(['Japanese'])[0]).toBe(ROMANIZED);
    expect(translationLanguagesFor(['ko'])[0]).toBe(ROMANIZED);
    expect(translationLanguagesFor(['French'])).not.toContain(ROMANIZED);
    expect(translationLanguagesFor()).toBe(LANGUAGES);
  });

  it('is what lyrics sites call a transliteration', () => {
    expect(findTranslationLanguageName('Transliteration')).toBe('Romanized');
    expect(findTranslationLanguageName('Genius Romanizations')).toBe('Romanized');
    expect(findTranslationLanguageName('Rōmaji')).toBe('Romanized');
    expect(findTranslationLanguageName('English translation')).toBe('English');
    expect(getFlagForLanguage('Romanized')).toBe('🔤');
  });

  it('tells romaji from kana and kanji', () => {
    expect(isMostlyLatin('Yoru ni kakeru')).toBe(true);
    expect(isMostlyLatin('夜に駆ける')).toBe(false);
    expect(isMostlyLatin('沈むように溶けてゆくように (Shizumu you ni)')).toBe(false);
    expect(isMostlyLatin('')).toBe(false);
  });
});
