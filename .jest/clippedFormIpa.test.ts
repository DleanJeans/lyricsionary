import { clippedFormIpa } from '../src/utils/wiktionary';

describe('clippedFormIpa', () => {
  it('drops only the schwa of clipped -n forms', () => {
    expect(clippedFormIpa('erklär‘n', '/ɛɐ̯ˈklɛːrən/')).toBe('/ɛɐ̯ˈklɛːrn/');
    expect(clippedFormIpa("geh'n", '/ˈɡeːən/')).toBe('/ˈɡeːn/');
  });
  it('drops the whole ending of kauf’', () => {
    expect(clippedFormIpa("kauf'", '/ˈkaʊ̯fə/')).toBe('/kaʊ̯f/');
  });
});
