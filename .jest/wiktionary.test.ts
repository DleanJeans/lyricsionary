import { getFormOfGloss, getShortGlosses, isMissingPage, parseDefinitions, stripDefinitionHtml } from '../src/utils/wiktionary';

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

describe('getFormOfGloss', () => {
  it('reads the gloss span of a form-of definition', () => {
    const html = '<span class="form-of-definition use-with-mention"><a href="/wiki/Appendix:Glossary#nominative_case">nominative</a>/<a>accusative</a>/<a>genitive</a> <a>plural</a> of <span class="form-of-definition-link"><i class="Latn mention" lang="de"><a href="/wiki/Gef%C3%BChl#German">Gefühl</a></i></span> <span class="mention-gloss-double-quote">“</span><span class="mention-gloss">feelings</span><span class="mention-gloss-double-quote">”</span></span>';
    expect(getFormOfGloss(html)).toBe('feelings');
  });

  it('falls back to a quoted gloss after "of"', () => {
    expect(getFormOfGloss('nominative/accusative/genitive plural of Gefühl "feelings"')).toBe('feelings');
  });

  it('leaves ordinary definitions alone', () => {
    expect(getFormOfGloss('A strong <a>affection</a>.')).toBeUndefined();
    expect(getFormOfGloss('plural of Gefühl')).toBeUndefined();
    expect(getFormOfGloss('the phrase "of course" said "loudly"')).toBe('loudly');
  });
});

describe('parseDefinitions with form-of entries', () => {
  it('suggests the gloss instead of the grammar description', () => {
    const response = {
      de: [{ partOfSpeech: 'Noun', language: 'German', definitions: [{ definition: 'plural of <i>Gefühl</i> <span class="mention-gloss-double-quote">“</span><span class="mention-gloss">feelings</span><span class="mention-gloss-double-quote">”</span>' }] }],
    };
    expect(parseDefinitions(response, 'German')).toEqual([{ partOfSpeech: 'Noun', text: 'feelings' }]);
  });
});

describe('getShortGlosses', () => {
  it('drops bracketed glosses and parentheticals', () => {
    expect(getShortGlosses('<a>always</a> <span class="gloss-brac">(</span><span class="gloss-content">at all times, without exception</span><span class="gloss-brac">)</span>')).toEqual(['always']);
    expect(getShortGlosses('always (at all times, without exception)')).toEqual(['always']);
    expect(getShortGlosses('<a href="/wiki/always">always</a> <span class="ib-brac qualifier-brac">(</span><span class="ib-content qualifier-content">at all times</span><span class="ib-brac qualifier-brac">)</span>')).toEqual(['always']);
  });

  it('drops glosses with links inside them', () => {
    expect(getShortGlosses('<a>landlord</a> <span class="gloss-brac">(</span><span class="gloss-content">he who <a>rents</a>, <a>lets</a></span><span class="gloss-brac">)</span>')).toEqual(['landlord']);
    expect(getShortGlosses('<a>landlord</a>, <a>lessor</a> <span class="gloss-content">he who <span><a>rents</a></span>, <a>lets</a></span>')).toEqual(['landlord', 'lessor']);
  });

  it('falls back to a leading linked translation', () => {
    expect(getShortGlosses('<a href="/wiki/always">always</a> at all times without exception')).toEqual(['always']);
    expect(getShortGlosses('used to <a>emphasize</a> another adverb of time, which itself is stressed')).toEqual([]);
  });

  it('splits synonyms and skips long explanations', () => {
    expect(getShortGlosses('very often; all the time; constantly')).toEqual(['very often', 'all the time', 'constantly']);
    expect(getShortGlosses('always, ever')).toEqual(['always', 'ever']);
    expect(getShortGlosses('to a greater degree over time, more and more')).toEqual([]);
    expect(getShortGlosses('used to emphasize another adverb of time, which itself is stressed')).toEqual([]);
  });
});

describe('parseDefinitions suggestions', () => {
  it('prefers short glosses, e.g. for immer', () => {
    const response = {
      de: [{ partOfSpeech: 'Adverb', language: 'German', definitions: [
        { definition: 'always (at all times, without exception)' },
        { definition: 'very often; all the time; constantly' },
        { definition: 'every time; whenever some precondition is given' },
        { definition: 'used to emphasize another adverb of time, which itself is stressed' },
      ] }],
    };
    expect(parseDefinitions(response, 'German').map((d) => d.text)).toEqual(['always', 'very often', 'all the time', 'constantly', 'every time']);
  });

  it('falls back to full definitions when there are no short glosses', () => {
    const response = { de: [{ partOfSpeech: 'Particle', language: 'German', definitions: [{ definition: 'used to emphasize another adverb of time, which itself is stressed' }] }] };
    expect(parseDefinitions(response, 'German').map((d) => d.text)).toEqual(['used to emphasize another adverb of time, which itself is stressed']);
  });
});
