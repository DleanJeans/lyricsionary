import { isMissingPage, parseDefinitions, stripDefinitionHtml } from '../src/utils/wiktionary';

describe('isMissingPage', () => {
  it('detects a missing page', () => {
    expect(isMissingPage({ query: { pages: [{ ns: 0, title: 'brief', missing: true }] } })).toBe(true);
  });

  it('detects an invalid title', () => {
    expect(isMissingPage({ query: { pages: [{ title: '[x]', invalid: true }] } })).toBe(true);
  });

  it('accepts an existing page', () => {
    expect(isMissingPage({ query: { pages: [{ pageid: 123, ns: 0, title: 'Brief' }] } })).toBe(false);
  });

  it('does not treat a malformed response as missing', () => {
    expect(isMissingPage({})).toBe(false);
    expect(isMissingPage(null)).toBe(false);
  });
});

describe('stripDefinitionHtml', () => {
  it('strips links and decodes entities', () => {
    expect(stripDefinitionHtml('<a rel="mw:WikiLink" href="/wiki/love">love</a> &amp; <i>affection</i>&#160;')).toBe('love & affection');
  });

  it('drops nested sub-sense lists', () => {
    expect(stripDefinitionHtml('to <a>go</a><ol><li>to travel</li></ol>')).toBe('to go');
  });
});

describe('parseDefinitions', () => {
  const response = {
    de: [
      { partOfSpeech: 'Noun', language: 'German', definitions: [{ definition: '<a>love</a>' }, { definition: '' }, { definition: 'love' }] },
      { partOfSpeech: 'Verb', language: 'German', definitions: [{ definition: 'first-person singular of <i>lieben</i>' }] },
    ],
    en: [{ partOfSpeech: 'Noun', language: 'English', definitions: [{ definition: 'an English sense' }] }],
  };

  it('keeps only the requested language, without empty or duplicate senses', () => {
    expect(parseDefinitions(response, 'german')).toEqual([
      { partOfSpeech: 'Noun', text: 'love' },
      { partOfSpeech: 'Verb', text: 'first-person singular of lieben' },
    ]);
  });

  it('returns nothing for a missing language or malformed response', () => {
    expect(parseDefinitions(response, 'French')).toEqual([]);
    expect(parseDefinitions(null, 'German')).toEqual([]);
  });
});
