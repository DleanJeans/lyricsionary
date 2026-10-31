import { formatIpa } from '../src/utils/ipaDisplay';

describe('formatIpa', () => {
  it('wraps bare IPA in slashes', () => {
    expect(formatIpa('bɔ̃.ʒuʁ', true)).toBe('/bɔ̃.ʒuʁ/');
  });

  it('keeps IPA that has its own slashes or brackets', () => {
    expect(formatIpa('/mɔ̃d/', true)).toBe('/mɔ̃d/');
    expect(formatIpa('[ʃtɔʏ̯ɐ]', true)).toBe('[ʃtɔʏ̯ɐ]');
  });

  it('drops slashes and brackets when they are hidden', () => {
    expect(formatIpa('/mɔ̃d/', false)).toBe('mɔ̃d');
    expect(formatIpa('[ʃtɔʏ̯ɐ]', false)).toBe('ʃtɔʏ̯ɐ');
    expect(formatIpa('/a/, /b/', false)).toBe('a, b');
    expect(formatIpa('lə', false)).toBe('lə');
  });
});
