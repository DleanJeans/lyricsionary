import { getWordTransforms, splitElisionParts, splitContractedPrefix } from '../src/utils/wordTransform';

describe('getWordTransforms', () => {
  it('returns empty array for empty input', () => {
    expect(getWordTransforms('')).toEqual([]);
  });

  it('returns empty array for single character', () => {
    expect(getWordTransforms('a')).toEqual([]);
  });

  it('handles capitalized words', () => {
    expect(getWordTransforms('Hello')).toContain('hello');
  });

  it('does not lowercase fully uppercase words', () => {
    expect(getWordTransforms('RER')).not.toContain('rer');
  });

  it("splits qu'c'est into elision parts", () => {
    const transforms = getWordTransforms("qu'c'est");
    expect(transforms).toContain("qu'");
    expect(transforms).toContain("c'");
    expect(transforms).toContain('est');
  });

  it("splits j'aime into parts", () => {
    const transforms = getWordTransforms("j'aime");
    expect(transforms).toContain("j'");
    expect(transforms).toContain('aime');
  });

  it("splits l'essence into parts", () => {
    const transforms = getWordTransforms("l'essence");
    expect(transforms).toContain("l'");
    expect(transforms).toContain('essence');
  });

  it("splits dell'umanità into parts", () => {
    const transforms = getWordTransforms("dell'umanità");
    expect(transforms).toContain("dell'");
    expect(transforms).toContain('umanità');
  });

  it("splits Qu'c'est (capitalized) into parts", () => {
    const transforms = getWordTransforms("Qu'c'est");
    expect(transforms).toContain("qu'");
    expect(transforms).toContain("c'");
    expect(transforms).toContain('est');
  });

  it('removes hyphenated prefix', () => {
    const transforms = getWordTransforms('senti-mentale');
    expect(transforms).toContain('mentale');
  });

  it('does not remove hyphens from words with apostrophes', () => {
    const transforms = getWordTransforms("qu'est-ce");
    expect(transforms).not.toContain("qu'estce");
  });
});

describe('splitElisionParts', () => {
  it('returns null for words without contracted prefix', () => {
    expect(splitElisionParts('hello')).toBeNull();
  });

  it("splits qu'c'est into three parts", () => {
    expect(splitElisionParts("qu'c'est")).toEqual(["qu'", "c'", 'est']);
  });

  it("splits j'aime into two parts", () => {
    expect(splitElisionParts("j'aime")).toEqual(["j'", 'aime']);
  });

  it("splits l'essence into two parts", () => {
    expect(splitElisionParts("l'essence")).toEqual(["l'", 'essence']);
  });

  it("splits j't'aime into three parts", () => {
    expect(splitElisionParts("j't'aime")).toEqual(["j'", "t'", 'aime']);
  });

  it("splits dell'umanità into two parts", () => {
    expect(splitElisionParts("dell'umanità")).toEqual(["dell'", 'umanità']);
  });

  it("splits sull'arte into two parts", () => {
    expect(splitElisionParts("sull'arte")).toEqual(["sull'", 'arte']);
  });
});

describe('splitContractedPrefix', () => {
  it('returns array with word for non-contracted words', () => {
    expect(splitContractedPrefix('hello')).toEqual(['hello']);
  });

  it("splits j'aime into prefix and base", () => {
    expect(splitContractedPrefix("j'aime")).toEqual(["j'", 'aime']);
  });

  it("splits l'essence into prefix and base", () => {
    expect(splitContractedPrefix("l'essence")).toEqual(["l'", 'essence']);
  });

  it("splits qu'c'est into prefix and base (skips intermediate)", () => {
    expect(splitContractedPrefix("qu'c'est")).toEqual(["qu'", 'est']);
  });

  it("splits dell'umanità into prefix and base", () => {
    expect(splitContractedPrefix("dell'umanità")).toEqual(["dell'", 'umanità']);
  });
});
