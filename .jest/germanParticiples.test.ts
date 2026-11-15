import gewartet from './fixtures/wiktionary/parse-gewartet.json';
import { germanParticipleLemmas, getWiktionaryDefinitions, getWiktionaryPronunciation, participleIpa } from '../src/utils/wiktionary';

const german = (body: string) => `<div class="mw-heading mw-heading2"><h2 id="German">German</h2></div>${body}`;
const ipaList = (...ipa: string[]) => `<ul><li>IPA: ${ipa.map((i) => `<span class="IPA nowrap">${i}</span>`).join(', ')}</li></ul>`;
// The past participle cell of a conjugation table, a red link when the participle has no page
const conjugation = (participle: string) =>
  `<div class="NavFrame"><table class="inflection-table"><tr><th>past participle</th><td><span class="Latn form-of lang-de pp-form-of" lang="de">` +
  `<a href="/w/index.php?title=${participle}&amp;action=edit&amp;redlink=1" class="new" title="${participle} (page does not exist)">${participle}</a></span></td></tr></table></div>`;
const formOf = (lemma: string) =>
  `<ol><li><span class="form-of-definition use-with-mention">past participle of <span class="form-of-definition-link">` +
  `<i class="Latn mention" lang="de"><a href="/wiki/${lemma}#German" title="${lemma}">${lemma}</a></i></span></span></li></ol>`;

describe('germanParticipleLemmas', () => {
  it('guesses the verb from a ge- participle', () => {
    expect(germanParticipleLemmas('gewartet')[0]).toBe('warten');
    expect(germanParticipleLemmas('gesagt')).toEqual(['sagen', 'sagn']);
    expect(germanParticipleLemmas('gewandert')).toContain('wandern');
    expect(germanParticipleLemmas('gefahren')).toEqual(['fahren']);
  });
  it('keeps a separable particle on the verb', () => {
    expect(germanParticipleLemmas('aufgehört')).toEqual(['aufhören', 'aufhörn']);
    expect(germanParticipleLemmas('Ausgemacht')).toEqual(['ausmachen', 'ausmachn']);
    expect(germanParticipleLemmas('zurückgekommen')).toEqual(['zurückkommen']);
  });
  it('skips words that are not ge- participles', () => {
    expect(germanParticipleLemmas('warten')).toEqual([]);
    expect(germanParticipleLemmas('gut')).toEqual([]);
  });
});

describe('participleIpa', () => {
  it('adds ge- and the ending to a weak verb’s stem', () => {
    expect(participleIpa('gewartet', 'warten', '/ˈvaʁtn̩/')).toBe('/ɡəˈvaʁtət/');
    expect(participleIpa('geredet', 'reden', '/ˈʁeːdn̩/')).toBe('/ɡəˈʁeːdət/');
    expect(participleIpa('gesagt', 'sagen', '/ˈzaːɡn̩/')).toBe('/ɡəˈzaːkt/');
    expect(participleIpa('gelebt', 'leben', '/ˈleːbn̩/')).toBe('/ɡəˈleːpt/');
    expect(participleIpa('gehört', 'hören', '/ˈhøːʁən/')).toBe('/ɡəˈhøːɐ̯t/');
    // Wiktionary's phonemic German IPA writes r, e.g. hören /ˈhøːrən/ and gehört /ɡəˈhøːɐ̯t/
    expect(participleIpa('gehört', 'hören', '/ˈhøːrən/')).toBe('/ɡəˈhøːɐ̯t/');
    expect(participleIpa('gewartet', 'warten', '/ˈvartən/')).toBe('/ɡəˈvartət/');
    expect(participleIpa('gemacht', 'machen', '/ˈmaxn̩/')).toBe('/ɡəˈmaxt/');
    expect(participleIpa('gewandert', 'wandern', '/ˈvandɐn/')).toBe('/ɡəˈvandɐt/');
  });
  it('keeps the verb’s stress where it is', () => {
    expect(participleIpa('getrompetet', 'trompeten', '/tʁɔmˈpeːtn̩/')).toBe('/ɡətʁɔmˈpeːtət/');
  });
  it('adds a glottal stop before a vowel', () => {
    expect(participleIpa('gearbeitet', 'arbeiten', '/ˈaʁbaɪ̯tn̩/')).toBe('/ɡəˈʔaʁbaɪ̯tət/');
  });
  it('adds ge- to a strong verb that keeps its vowel', () => {
    expect(participleIpa('gefahren', 'fahren', '/ˈfaːʁən/')).toBe('/ɡəˈfaːʁən/');
  });
  it('puts ge- after a separable particle, which keeps the stress', () => {
    expect(participleIpa('aufgehört', 'aufhören', '/ˈaʊ̯fˌhøːʁən/')).toBe('/ˈaʊ̯fɡəˌhøːɐ̯t/');
    expect(participleIpa('aufgehört', 'aufhören', '/ˈaʊ̯fˌhøːrən/')).toBe('/ˈaʊ̯fɡəˌhøːɐ̯t/');
    expect(participleIpa('ausgemacht', 'ausmachen', '/ˈaʊ̯sˌmaxn̩/')).toBe('/ˈaʊ̯sɡəˌmaxt/');
    expect(participleIpa('zurückgekommen', 'zurückkommen', '/t͡suˈʁʏkˌkɔmən/')).toBe('/t͡suˈʁʏkɡəˌkɔmən/');
  });
  it('gives up on a vowel change', () => {
    expect(participleIpa('gesungen', 'singen', '/ˈzɪŋən/')).toBeUndefined();
    expect(participleIpa('gegangen', 'gehen', '/ˈɡeːən/')).toBeUndefined();
  });
});

describe('a German participle on Wiktionary', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });
  const serve = (texts: Record<string, string>, definitions: Record<string, unknown> = {}) => {
    globalThis.fetch = jest.fn(async (url: string) => {
      if (url.includes('/page/definition/')) {
        const title = decodeURIComponent(url.split('/').pop() ?? '');
        const body = definitions[title];
        return body ? { ok: true, status: 200, json: async () => body } : { ok: false, status: 404 };
      }
      const title = decodeURIComponent(url.split('page=').pop() ?? '');
      const text = texts[title];
      return { ok: true, status: 200, json: async () => (text ? { parse: { title, text } } : { error: { code: 'missingtitle' } }) };
    }) as unknown as typeof fetch;
  };

  it('puts gewartet’s IPA and meaning together from warten when it has no page', async () => {
    serve(
      { warten: german(ipaList('/ˈvaʁtn̩/') + conjugation('gewartet')) },
      { warten: { de: [{ language: 'German', partOfSpeech: 'Verb', definitions: [{ definition: 'to wait' }] }] } },
    );
    expect(await getWiktionaryPronunciation('gewartet', 'German')).toEqual({ ipa: ['/ɡəˈvaʁtət/'], audio: [], derivedFrom: ['warten'] });
    expect(await getWiktionaryDefinitions('gewartet', 'German')).toEqual([{ partOfSpeech: 'Verb', text: 'to wait' }]);
  });

  it('doesn’t guess a verb whose conjugation doesn’t list the word', async () => {
    serve({ sagen: german(ipaList('/ˈzaːɡn̩/') + conjugation('gesagt')) });
    expect(await getWiktionaryPronunciation('gesägt', 'German')).toEqual({ ipa: [], audio: [] });
  });

  it('uses the verb a participle page without IPA is a form of', async () => {
    serve({
      ausgemacht: german(`<div class="mw-heading mw-heading3"><h3 id="Verb">Verb</h3></div>${formOf('ausmachen')}`),
      ausmachen: german(ipaList('/ˈaʊ̯sˌmaxn̩/')),
    });
    expect(await getWiktionaryPronunciation('ausgemacht', 'German')).toEqual({ ipa: ['/ˈaʊ̯sɡəˌmaxt/'], audio: [], derivedFrom: ['ausmachen'] });
  });

  it('prefers the participle’s own IPA', async () => {
    // Pages are cached for the session, so each test uses its own words
    serve({ gespielt: german(ipaList('/ɡəˈʃpiːlt/') + formOf('spielen')), spielen: german(ipaList('/ˈʃpiːlən/')) });
    expect(await getWiktionaryPronunciation('gespielt', 'German')).toEqual({ ipa: ['/ɡəˈʃpiːlt/'], audio: [] });
  });

  it('takes a separable verb’s core participle when its vowel changes', async () => {
    serve({
      mitgenommen: german(formOf('mitnehmen')),
      mitnehmen: german(ipaList('/ˈmɪtˌneːmən/')),
      genommen: german(ipaList('/ɡəˈnɔmən/')),
    });
    expect(await getWiktionaryPronunciation('mitgenommen', 'German')).toEqual({ ipa: ['/ˈmɪtɡəˌnɔmən/'], audio: [], derivedFrom: ['mitnehmen'] });
  });

  it('takes gewartet’s IPA from warten on the real page, which only says past participle of warten', async () => {
    const headword = `<p><span class="headword-line">(<i>past participle</i> <b class="Latn" lang="de"><a href="/wiki/gewartet#German" title="gewartet">gewartet</a></b>)</span></p>`;
    serve({
      gewartet: (gewartet as { parse: { text: string } }).parse.text,
      warten: german(ipaList('/ˈvartən/', '[ˈvaʁ.tn̩]') + headword),
    });
    // A fresh copy of the module, since warten's page is cached from the test above
    jest.resetModules();
    const fresh = await import('../src/utils/wiktionary');
    expect(await fresh.getWiktionaryPronunciation('gewartet', 'German')).toMatchObject({ ipa: ['/ɡəˈvartət/'], derivedFrom: ['warten'] });
  });
});
