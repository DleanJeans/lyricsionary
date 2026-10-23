import {
  getFormOfGloss,
  getFormOfLemma,
  getShortGlosses,
  getWiktionaryDefinitions,
  isMissingPage,
  parseDefinitions,
  parseEntry,
  stripDefinitionHtml,
} from '../src/utils/wiktionary';

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

  it('skips the first word of a longer explanation', () => {
    expect(getShortGlosses('<a>Affectionate</a>, <a>benevolent</a> <a>concern</a> or <a>care</a> for other <a>people</a> or <a>beings</a>, and for their <a>well-being</a>.')).toEqual([]);
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
const MICH =
  '<span class="form-of-definition use-with-mention" about="#mwt5" typeof="mw:Transclusion"><a rel="mw:WikiLink" href="/wiki/Appendix:Glossary#accusative_case" title="Appendix:Glossary">accusative</a> of <span class="form-of-definition-link"><i class="Latn mention" lang="de"><a rel="mw:WikiLink" href="/wiki/ich#German" title="ich">ich</a></i></span></span>: <a rel="mw:WikiLink" href="/wiki/me" title="me">me</a>';
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

  it('reads the gloss after a form-of definition', () => {
    expect(getFormOfGloss(MICH)).toBe('me');
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

const FRAGT = [
  '<span class="form-of-definition use-with-mention" about="#mwt33" typeof="mw:Transclusion">inflection of <span class="form-of-definition-link"><i class="Latn mention" lang="de"><a rel="mw:WikiLink" href="/wiki/fragen#German" title="fragen">fragen</a></i></span>:</span><span about="#mwt33">\n</span><ol about="#mwt33"><li><span class="form-of-definition use-with-mention"><a rel="mw:WikiLink" href="/wiki/Appendix:Glossary#third_person" title="Appendix:Glossary">third-person</a> <a rel="mw:WikiLink" href="/wiki/Appendix:Glossary#singular_number" title="Appendix:Glossary">singular</a> <a rel="mw:WikiLink" href="/wiki/Appendix:Glossary#present_tense" title="Appendix:Glossary">present</a></span></li></ol>',
  '<span class="form-of-definition use-with-mention"><a rel="mw:WikiLink" href="/wiki/Appendix:Glossary#third_person" title="Appendix:Glossary">third-person</a> <a rel="mw:WikiLink" href="/wiki/Appendix:Glossary#singular_number" title="Appendix:Glossary">singular</a> <a rel="mw:WikiLink" href="/wiki/Appendix:Glossary#present_tense" title="Appendix:Glossary">present</a></span>',
];
const STYLE = 'style';
const LINK = 'link';
// The real HTML's style and link tags, built here so they don't read as markup in patches
const FRAGEN = [
  `<span class="usage-label-sense" about="#mwt26" typeof="mw:Transclusion"></span> to <a rel="mw:WikiLink" href="/wiki/ask" title="ask">ask</a> ${'<' + STYLE} data-mw-deduplicate="TemplateStyles:r90144471" typeof="mw:Extension/templatestyles mw:Transclusion" about="#mwt27">.mw-parser-output .object-usage-tag{font-style:italic}.mw-parser-output .deprecated{color:var(--wikt-palette-grey-lime-8,olivedrab)}</${STYLE}><span about="#mwt27">[</span><i about="#mwt27">with</i><span about="#mwt27"> </span><span class="object-usage-tag" about="#mwt27"><a rel="mw:WikiLink" href="/wiki/Appendix:Glossary#accusative_case" title="Appendix:Glossary">accusative</a></span><span about="#mwt27"> </span><small about="#mwt27">‘someone’</small><span about="#mwt27"> </span><i about="#mwt27">and</i><span about="#mwt27"> </span><span class="object-usage-tag" about="#mwt27"><a rel="mw:WikiLink" href="/wiki/Appendix:Glossary#accusative_case" title="Appendix:Glossary">accusative</a></span><span about="#mwt27"> </span><small about="#mwt27">‘something’</small><span about="#mwt27">]</span>`,
  `<span class="usage-label-sense" about="#mwt30" typeof="mw:Transclusion"></span> to <a rel="mw:WikiLink" href="/wiki/ask_for" title="ask for">ask for</a>, to <a rel="mw:WikiLink" href="/wiki/ask_after" title="ask after">ask after</a> ${'<' + LINK} rel="mw-deduplicated-inline-style" about="#mwt31" typeof="mw:Extension/templatestyles mw:Transclusion"><span about="#mwt31">[</span><i about="#mwt31">with</i><span about="#mwt31"> </span><b class="Latn" lang="de" about="#mwt31"><a rel="mw:WikiLink" href="/wiki/nach#German" title="nach">nach</a></b><span about="#mwt31"> </span><small about="#mwt31">‘someone/something’</small><span about="#mwt31">]</span>`,
  '<span class="usage-label-sense" about="#mwt33" typeof="mw:Transclusion"></span> to <a rel="mw:WikiLink" href="/wiki/wonder" title="wonder">wonder</a>',
];
const BLEIB =
  '<span class="form-of-definition use-with-mention" about="#mwt6" typeof="mw:Transclusion"><a rel="mw:WikiLink" href="/wiki/Appendix:Glossary#singular_number" title="Appendix:Glossary">singular</a> <a rel="mw:WikiLink" href="/wiki/Appendix:Glossary#imperative_mood" title="Appendix:Glossary">imperative</a> of <span class="form-of-definition-link"><i class="Latn mention" lang="de"><a rel="mw:WikiLink" href="/wiki/bleiben#German" title="bleiben">bleiben</a></i></span></span>';

describe('inflected forms', () => {
  it('finds the base form and drops the grammar descriptions', () => {
    expect(getFormOfLemma(FRAGT[0])).toBe('fragen');
    expect(getFormOfLemma(BLEIB)).toBe('bleiben');
    expect(getFormOfLemma(FRAGT[1])).toBeUndefined();
    expect(parseEntry({ de: [section('German', 'Verb', FRAGT)] }, 'German')).toEqual({ glosses: [], definitions: [], lemmas: ['fragen'] });
  });

  it('reads fragen without its usage notes and styles', () => {
    expect(texts({ de: [section('German', 'Verb', FRAGEN)] }, 'German')).toEqual(['to ask', 'to ask for', 'to ask after', 'to wonder']);
  });

  it('suggests the base form definitions for an inflected word', async () => {
    const pages: Record<string, unknown> = {
      fragt: { de: [section('German', 'Verb', FRAGT)] },
      fragen: { de: [section('German', 'Verb', FRAGEN)] },
    };
    const fetchMock = jest.fn(async (url: string) => {
      const page = pages[decodeURIComponent(url.split('/').pop() ?? '')];
      return { ok: !!page, status: page ? 200 : 404, json: async () => page };
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      expect((await getWiktionaryDefinitions('fragt', 'German'))?.map((d) => d.text)).toEqual([
        'to ask',
        'to ask for',
        'to ask after',
        'to wonder',
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
