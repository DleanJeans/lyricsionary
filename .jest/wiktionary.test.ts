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

// Definition HTML as returned by en.wiktionary.org/api/rest_v1/page/definition/<word> (2026-10-21)
const IMMER = [
  '<a rel="mw:WikiLink" href="/wiki/always" title="always">always</a>\n<ol><li>at all times without exception',
  'at all times without exception',
  'very often; all the time; <a rel="mw:WikiLink" href="/wiki/constantly" title="constantly">constantly</a>',
  'every time; whenever some precondition is given',
  '<span class="usage-label-sense" about="#mwt82" typeof="mw:Transclusion"></span> to a greater degree over time, <a rel="mw:WikiLink" href="/wiki/more_and_more" title="more and more">more and more</a>',
  '<span class="usage-label-sense" about="#mwt84" typeof="mw:Transclusion"></span> <span class="use-with-mention" about="#mwt85" typeof="mw:Transclusion">used to emphasize another adverb of time, which itself is stressed</span>',
];
const VERMIETER =
  '<a rel="mw:WikiLink" href="/wiki/landlord" title="landlord">landlord</a> <span class="mention-gloss-paren" about="#mwt11" typeof="mw:Transclusion">(</span><span class="mention-gloss" about="#mwt11">he who <a rel="mw:WikiLink" href="/wiki/rent#English" title="rent">rents</a>, <a rel="mw:WikiLink" href="/wiki/let#English" title="let">lets</a></span><span class="mention-gloss-paren" about="#mwt11">)</span>';
const GEFUEHLE =
  '<span class="form-of-definition use-with-mention" about="#mwt7" typeof="mw:Transclusion"><span class="inflection-of-conjoined"><a rel="mw:WikiLink" href="/wiki/Appendix:Glossary#nominative_case" title="Appendix:Glossary">nominative</a><span class="inflection-of-sep">/</span><a rel="mw:WikiLink" href="/wiki/Appendix:Glossary#accusative_case" title="Appendix:Glossary">accusative</a><span class="inflection-of-sep">/</span><a rel="mw:WikiLink" href="/wiki/Appendix:Glossary#genitive_case" title="Appendix:Glossary">genitive</a></span> <a rel="mw:WikiLink" href="/wiki/Appendix:Glossary#plural_number" title="Appendix:Glossary">plural</a> of <span class="form-of-definition-link"><i class="Latn mention" lang="de"><a rel="mw:WikiLink" href="/wiki/Gefühl#German" title="Gefühl">Gefühl</a></i></span></span> "<a rel="mw:WikiLink" href="/wiki/feelings" title="feelings">feelings</a>"';
const LOVE_LOFE =
  '<span class="form-of-definition use-with-mention" about="#mwt213" typeof="mw:Transclusion">Alternative form of <span class="form-of-definition-link"><i class="Latn mention" lang="en"><a rel="mw:WikiLink" href="/wiki/lofe#English:_verb" title="lofe">lofe</a></i> <span class="mention-gloss-paren annotation-paren">(</span><span class="mention-gloss-double-quote">“</span><span class="mention-gloss">to praise, sell</span><span class="mention-gloss-double-quote">”</span><span class="mention-gloss-paren annotation-paren">)</span></span></span>.';
const LOVE_HEART =
  '<span class="usage-label-sense"></span> <span class="form-of-definition use-with-mention">Synonym of <span class="form-of-definition-link"><i class="Latn mention" lang="en"><a rel="mw:WikiLink" href="/wiki/heart#English:_show_approval_of_via_a_heart_symbol" title="heart">heart</a></i> <span class="mention-gloss-paren annotation-paren">(</span><span class="ann-pos">verb</span><span class="mention-gloss-paren annotation-paren">)</span></span></span>.';

const section = (language: string, partOfSpeech: string, definitions: string[]) => ({
  language,
  partOfSpeech,
  definitions: definitions.map((definition) => ({ definition })),
});
const texts = (response: unknown, language: string) => parseDefinitions(response, language).map((d) => d.text);

describe('real Wiktionary responses', () => {
  it('immer suggests always first', () => {
    expect(texts({ de: [section('German', 'Adverb', IMMER)] }, 'German')).toEqual([
      'always',
      'very often',
      'all the time',
      'constantly',
      'every time',
    ]);
  });

  it('Vermieter suggests landlord, not its gloss', () => {
    expect(getFormOfGloss(VERMIETER)).toBeUndefined();
    expect(texts({ de: [section('German', 'Noun', [VERMIETER])] }, 'German')).toEqual(['landlord']);
  });

  it('Gefühle suggests the gloss of its lemma', () => {
    expect(getFormOfGloss(GEFUEHLE)).toBe('feelings');
    expect(texts({ de: [section('German', 'Noun', [GEFUEHLE])] }, 'German')).toEqual(['feelings']);
  });

  it('reads form-of gloss spans and skips form-of entries without one', () => {
    expect(getFormOfGloss(LOVE_LOFE)).toBe('to praise, sell');
    expect(getFormOfGloss(LOVE_HEART)).toBeUndefined();
    expect(texts({ en: [section('English', 'Verb', [LOVE_HEART, '', 'Nothing; no recompense. <!--see Hotten\'s Slang Dictionary 1873-->'])] }, 'English')).toEqual([
      'Nothing',
      'no recompense',
    ]);
  });
});
