import { LANGUAGES, getFlagForLanguage, getLanguageNameFromCode } from '../src/constants/languages';

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
