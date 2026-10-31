import { FIND_IPA_IN_TEXT } from '../src/utils/scrapeGoogleIpaJS';

const findIpa = new Function('text', FIND_IPA_IN_TEXT) as (text: string) => string[];

describe('FIND_IPA_IN_TEXT', () => {
  it('finds IPA in slashes and brackets', () => {
    const text = 'AI Overview\nAmour is pronounced /a.muʁ/ in French, [aˈmuʁ] narrowly.\nMore: /a.muʁ/';
    expect(findIpa(text)).toEqual(['/a.muʁ/', '[aˈmuʁ]']);
  });

  it('skips paths, links and plain words in slashes or brackets', () => {
    expect(findIpa('https://www.google.com/search/ and/or [1] [Video] /amour/')).toEqual([]);
  });

  it('runs on a page without IPA', () => {
    expect(findIpa('')).toEqual([]);
  });
});
