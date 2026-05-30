import { normalizeApostrophes } from '../src/utils/normalizeApostrophes';

describe('normalizeApostrophes', () => {
  it('returns empty string for empty input', () => {
    expect(normalizeApostrophes('')).toBe('');
  });

  it('returns falsy input as-is', () => {
    expect(normalizeApostrophes(null as any)).toBeNull();
    expect(normalizeApostrophes(undefined as any)).toBeUndefined();
  });

  it('does not change standard apostrophe', () => {
    expect(normalizeApostrophes("it's")).toBe("it's");
  });

  it('normalizes prime (U+2032)', () => {
    expect(normalizeApostrophes("dell\u2032umanità")).toBe("dell'umanità");
  });

  it('normalizes reverse prime (U+2035)', () => {
    expect(normalizeApostrophes("l\u2035homme")).toBe("l'homme");
  });

  it('normalizes left single quotation mark (U+2018)', () => {
    expect(normalizeApostrophes("\u2018ello")).toBe("'ello");
  });

  it('normalizes right single quotation mark (U+2019)', () => {
    expect(normalizeApostrophes("It\u2019s")).toBe("It's");
  });

  it('normalizes single low-9 quotation mark (U+201A)', () => {
    expect(normalizeApostrophes("test\u201As")).toBe("test's");
  });

  it('normalizes single high-reversed-9 quotation mark (U+201B)', () => {
    expect(normalizeApostrophes("test\u201Bs")).toBe("test's");
  });

  it('normalizes modifier letter apostrophe (U+02BC)', () => {
    expect(normalizeApostrophes("qu\u02BCc\u02BCest")).toBe("qu'c'est");
  });

  it('normalizes grave accent (U+0060)', () => {
    expect(normalizeApostrophes("test`s")).toBe("test's");
  });

  it('normalizes fullwidth apostrophe (U+FF07)', () => {
    expect(normalizeApostrophes("test\uFF07s")).toBe("test's");
  });

  it('normalizes multiple special apostrophes in one string', () => {
    expect(normalizeApostrophes("qu\u2019c\u2019est")).toBe("qu'c'est");
  });

  it('normalizes mixed apostrophe types', () => {
    expect(normalizeApostrophes("l\u2032homme\u2019s")).toBe("l'homme's");
  });

  it('preserves regular text around apostrophes', () => {
    expect(normalizeApostrophes("hello world")).toBe("hello world");
  });
});
