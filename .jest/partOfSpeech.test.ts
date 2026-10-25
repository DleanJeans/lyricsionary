import { fillPartsOfSpeech, findPartOfSpeech, normalizePartOfSpeech } from '../src/utils/partOfSpeech';

const verb = (text: string) => ({ partOfSpeech: 'Verb', text });
const noun = (text: string) => ({ partOfSpeech: 'Noun', text });

describe('normalizePartOfSpeech', () => {
  it('keeps the main types', () => {
    expect(normalizePartOfSpeech('Noun')).toBe('noun');
    expect(normalizePartOfSpeech('Verb')).toBe('verb');
    expect(normalizePartOfSpeech('Adjective')).toBe('adjective');
  });

  it('maps narrower headings onto a main type', () => {
    expect(normalizePartOfSpeech('Proper noun')).toBe('noun');
    expect(normalizePartOfSpeech('Article')).toBe('determiner');
    expect(normalizePartOfSpeech('Participle')).toBe('adjective');
    expect(normalizePartOfSpeech('Letter')).toBe('other');
    expect(normalizePartOfSpeech('')).toBeUndefined();
  });
});

describe('findPartOfSpeech', () => {
  const leben = [noun('life'), verb('to live'), verb('to reside')];

  it('finds the type of a picked suggestion', () => {
    expect(findPartOfSpeech('life', leben)).toBe('noun');
    expect(findPartOfSpeech('to live', leben)).toBe('verb');
  });

  it('matches a suggestion whose "to" was dropped, or one of its meanings', () => {
    expect(findPartOfSpeech('live', leben)).toBe('verb');
    expect(findPartOfSpeech('Live.', leben)).toBe('verb');
    expect(findPartOfSpeech('reside; dwell', leben)).toBe('verb');
  });

  it('uses the only type the word has when nothing matches', () => {
    expect(findPartOfSpeech('my sweetheart', [noun('heart'), noun('core')])).toBe('noun');
    expect(findPartOfSpeech(undefined, [noun('heart')])).toBe('noun');
  });

  it("can't tell when the word has several types and nothing matches", () => {
    expect(findPartOfSpeech('living', leben)).toBeUndefined();
    expect(findPartOfSpeech('love', [])).toBeUndefined();
  });
});

describe('fillPartsOfSpeech', () => {
  const leben = [noun('life'), verb('to live')];

  it('fills only the definitions with no type', () => {
    expect(
      fillPartsOfSpeech(
        [{ definition: 'life' }, { definition: 'live', partOfSpeech: 'noun' as const }, { definition: '' }],
        leben
      )
    ).toEqual([{ definition: 'life', partOfSpeech: 'noun' }, { definition: 'live', partOfSpeech: 'noun' }, { definition: '' }]);
  });

  it('is null when nothing was found', () => {
    expect(fillPartsOfSpeech([{ definition: 'living' }], leben)).toBeNull();
    expect(fillPartsOfSpeech([{ definition: 'life', partOfSpeech: 'noun' as const }], leben)).toBeNull();
  });
});
