import { mergeGeniusVersions, splitGeniusVersions } from '../src/utils/geniusVersions';

const ORIGINAL = 'https://genius.com/Masayuki-suzuki-daddy-daddy-do-lyrics';
const ENGLISH = 'https://genius.com/Genius-english-translations-daddy-daddy-do-lyrics';
const CHINESE = 'https://genius.com/Genius-chinese-translations-daddy-daddy-do-lyrics';
const ROMANIZED = 'https://genius.com/Genius-romanizations-daddy-daddy-do-lyrics';

describe('splitGeniusVersions', () => {
  it('gives the original and a tab for every other version, Romanized first', () => {
    const { original, translations } = splitGeniusVersions([
      { url: ENGLISH, language: 'en', isOriginal: false, text: 'I want', title: 'English page' },
      { url: ORIGINAL, language: 'ja', isOriginal: true, text: '欲しい' },
      { url: CHINESE, language: 'zh-Hant', isOriginal: false, text: '想要' },
      { url: ROMANIZED, language: 'romanization', isOriginal: false, text: 'Hoshii' },
    ]);
    expect(original.url).toBe(ORIGINAL);
    expect(translations).toEqual([
      { language: 'Romanized', lyrics: 'Hoshii', url: ROMANIZED, title: undefined },
      { language: 'English', lyrics: 'I want', url: ENGLISH, title: 'English page' },
      { language: 'Chinese', lyrics: '想要', url: CHINESE, title: undefined },
    ]);
  });

  it('reads the languages from the dropdown labels', () => {
    const { translations } = splitGeniusVersions([
      { url: ORIGINAL, language: '日本語 (Japanese)', isOriginal: true, text: '欲しい' },
      { url: CHINESE, language: '繁體中文 (Traditional Chinese)', isOriginal: false, text: '想要' },
      { url: ROMANIZED, language: 'Romanization', isOriginal: false, text: 'Hoshii' },
    ]);
    expect(translations.map((t) => t.language)).toEqual(['Romanized', 'Chinese']);
  });

  it('leaves out a second version for the same language and one in the original language', () => {
    const { translations } = splitGeniusVersions([
      { url: ORIGINAL, language: 'fr', isOriginal: true, text: 'Menteuse' },
      { url: ENGLISH, language: 'en', isOriginal: false, text: 'Liar' },
      { url: ENGLISH + '-2', language: 'en', isOriginal: false, text: 'Liar 2' },
      { url: CHINESE, language: 'fr', isOriginal: false, text: 'Menteuse 2' },
    ]);
    expect(translations.map((t) => t.lyrics)).toEqual(['Liar']);
  });
});

describe('mergeGeniusVersions', () => {
  it('keeps the text fetched earlier for the same song', () => {
    const merged = mergeGeniusVersions(
      [
        { url: ORIGINAL, language: 'ja', isOriginal: true, text: '欲しい' },
        { url: ROMANIZED, language: 'romanization', isOriginal: false },
      ],
      [
        { url: ROMANIZED, language: 'romanization', isOriginal: false, text: 'Hoshii' },
        { url: ORIGINAL, language: 'ja', isOriginal: true },
      ]
    );
    expect(merged.every((v) => v.text)).toBe(true);
  });

  it('starts over for another song', () => {
    const next = [{ url: ENGLISH, language: 'en', isOriginal: false }];
    expect(mergeGeniusVersions([{ url: ORIGINAL, language: 'ja', isOriginal: true, text: 'x' }], next)).toBe(next);
  });
});
