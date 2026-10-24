import { findDefinitionHighlight, findDefinitionHighlights, pickDefinition, withWordForms } from '../src/utils/definitionHighlight';

const highlighted = (text: string, definition: string) =>
  findDefinitionHighlight(text, [definition])?.map(([start, end]) => text.slice(start, end)) ?? null;

describe('findDefinitionHighlight', () => {
  it('finds whole words only', () => {
    expect(highlighted('I have no time', 'no')).toEqual(['no']);
    expect(highlighted('I know', 'no')).toBeNull();
  });

  it("finds contracted parts like 've and n't inside words", () => {
    expect(highlighted("I've got it", "'ve got")).toEqual(["'ve got"]);
    expect(highlighted("It isn't love", "n't")).toEqual(["n't"]);
    expect(highlighted("It isn't love", 'is')).toEqual(['is']);
    expect(highlighted("I don't know", 'do')).toEqual(['do']);
    expect(highlighted('It isnot love', 'is')).toBeNull();
    expect(highlighted('It isn’t love', "not; n't")).toEqual(['n’t']);
  });

  it('finds words in their irregular contractions', () => {
    expect(highlighted("I won't stay", 'will')).toEqual(['wo']);
    expect(highlighted("I won't stay", 'will not')).toEqual(['wo', "n't"]);
    expect(highlighted("It isn't love", 'not')).toEqual(["n't"]);
    expect(highlighted('I cannot stay', 'can not')).toEqual(['can', 'not']);
    expect(highlighted('I cannot stay', 'not')).toEqual(['not']);
    expect(highlighted("I'll be there", 'will')).toEqual(["'ll"]);
    expect(highlighted("You're mine", 'are')).toEqual(["'re"]);
    expect(highlighted("We shan't", 'shall')).toEqual(['sha']);
    expect(highlighted('I want it', 'will')).toBeNull();
    expect(highlighted('a knot', 'not')).toBeNull();
  });

  it('finds phrases split up by other words', () => {
    expect(highlighted("Don't give much away", 'give away')).toEqual(['give', 'away']);
    expect(highlighted('Give it all up', 'give up')).toEqual(['Give', 'up']);
  });

  it('prefers a phrase in one piece', () => {
    expect(highlighted('give much away, give away', 'give away')).toEqual(['give away']);
  });

  it("doesn't join words that are too far apart or across a sentence", () => {
    expect(highlighted('give me one more chance today away', 'give away')).toBeNull();
    expect(highlighted('I give. Go away', 'give away')).toBeNull();
  });
});

describe('pickDefinition with split phrases', () => {
  it('fills in a definition whose words are split up in the translation', () => {
    expect(pickDefinition([{ partOfSpeech: 'Verb', text: 'to betray' }, { partOfSpeech: 'Verb', text: 'to give away' }], "Don't give much away")).toBe('give away');
  });
});

describe('findDefinitionHighlights', () => {
  it('joins parts that sit next to each other', () => {
    expect(findDefinitionHighlights('I wrote you a love letter', [['love'], ['letter; mail']])).toEqual([[14, 25]]);
  });

  it('keeps parts apart when other words sit between them', () => {
    expect(findDefinitionHighlights('a letter full of love', [['love'], ['letter']])).toEqual([[2, 8], [17, 21]]);
  });

  it('skips parts that do not match and merges overlaps', () => {
    expect(findDefinitionHighlights('love letter', [['love letter'], ['letter'], ['shoe']])).toEqual([[0, 11]]);
    expect(findDefinitionHighlights('love letter', [['shoe']])).toBeNull();
  });
});

describe('withWordForms', () => {
  it('highlights a saved definition in the forms the translation uses', () => {
    const find = (text: string, definitions: string[]) =>
      findDefinitionHighlight(text, withWordForms(definitions))?.map(([start, end]) => text.slice(start, end)) ?? null;
    expect(find('I love you', ['to love'])).toEqual(['love']);
    expect(find('I loved you', ['to love'])).toEqual(['loved']);
    expect(find('Loving you', ['to cherish; to love'])).toEqual(['Loving']);
    expect(find('I want to love you', ['to love'])).toEqual(['to love']);
    expect(find('All my worries', ['worry; care'])).toEqual(['worries']);
    expect(withWordForms(['love'])).toEqual(['love', 'loves']);
  });
});
