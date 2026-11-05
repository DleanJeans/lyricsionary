import { getLanguageSection, getWiktionaryPronunciation, joinIpa, parseAudio, parseEtymologyParts, parseIpa } from '../src/utils/wiktionary';
import amour from './fixtures/wiktionary/parse-amour.json';
import corazon from './fixtures/wiktionary/parse-corazón.json';
import immer from './fixtures/wiktionary/parse-immer.json';
import liebe from './fixtures/wiktionary/parse-Liebe.json';
import steuerberater from './fixtures/wiktionary/parse-Steuerberater.json';

// Real parse API responses (prop=text), fetched with an Android WebView user agent
const pages: Record<string, { parse: { text: string } }> = { amour, 'corazón': corazon, immer, Liebe: liebe, Steuerberater: steuerberater };
const page = (title: string): string => pages[title].parse.text;

describe('getLanguageSection', () => {
  it('finds the section under the language heading', () => {
    const section = getLanguageSection(page('immer'), 'German');
    expect(section).toContain('De-immer.ogg');
    expect(section).not.toContain('Nl-immer.ogg');
  });

  it('matches multi-word languages by their heading id', () => {
    expect(getLanguageSection(page('immer'), 'Alemannic German')).toContain('Gsw-züritüütsch-immer.ogg');
  });

  it('returns undefined for a language without a section', () => {
    expect(getLanguageSection(page('Liebe'), 'French')).toBeUndefined();
  });
});

describe('parseAudio', () => {
  it('lists the recordings with their accents, preferring the MP3 transcode', () => {
    expect(parseAudio(page('Liebe'), 'German')).toEqual([
      {
        title: 'De-Liebe2.ogg',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/d/de/De-Liebe2.ogg/De-Liebe2.ogg.mp3',
        label: 'Germany (Berlin)',
      },
      {
        title: 'De-Liebe.ogg',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/d/dd/De-Liebe.ogg/De-Liebe.ogg.mp3',
        label: '',
      },
    ]);
  });

  it('keeps only the requested language', () => {
    expect(parseAudio(page('immer'), 'German').map((a) => a.title)).toEqual(['De-immer.ogg', 'De-immer2.ogg', 'De-at-immer.ogg']);
    expect(parseAudio(page('immer'), 'Dutch').map((a) => a.title)).toEqual(['Nl-immer.ogg']);
    expect(parseAudio(page('amour'), 'English').map((a) => a.title)).toEqual(['LL-Q1860_(eng)-Vealhurl-amour.wav']);
  });

  it('reads Lingua Libre WAV recordings', () => {
    expect(parseAudio(page('corazón'), 'Spanish')).toEqual([
      {
        title: 'LL-Q1321_(spa)-Rodelar-corazón.wav',
        url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/b/bc/LL-Q1321_%28spa%29-Rodelar-coraz%C3%B3n.wav/LL-Q1321_%28spa%29-Rodelar-coraz%C3%B3n.wav.mp3',
        label: 'Spain',
      },
    ]);
  });

  it('labels every French recording of amour', () => {
    const audio = parseAudio(page('amour'), 'French');
    expect(audio).toHaveLength(8);
    expect(audio.every((a) => a.url.startsWith('https://upload.wikimedia.org/') && a.url.endsWith('.mp3'))).toBe(true);
  });

  it('falls back to the original file without an MP3 transcode', () => {
    const html =
      '<div class="mw-heading mw-heading2"><h2 id="German">German</h2></div><table class="audiotable"><tr><td>Audio:</td>' +
      '<td><audio data-mwtitle="De-x.ogg"><source src="//upload.wikimedia.org/x.ogg?a=1&amp;b=2" type="audio/ogg"/></audio></td></tr></table>';
    expect(parseAudio(html, 'German')).toEqual([{ title: 'De-x.ogg', url: 'https://upload.wikimedia.org/x.ogg?a=1&b=2', label: '' }]);
  });
});

describe('parseIpa', () => {
  it('reads the phonemic transcriptions without rhymes', () => {
    expect(parseIpa(page('Liebe'), 'German')).toEqual(['/ˈliːbə/']);
    expect(parseIpa(page('amour'), 'French')).toEqual(['/a.muʁ/']);
  });

  it('skips narrow transcriptions and partial ones', () => {
    expect(parseIpa(page('corazón'), 'Spanish')).toEqual(['/koɾaˈθon/', '/koɾaˈson/']);
    expect(parseIpa(page('amour'), 'English')).toEqual(['/ˈæmə(ɹ)/', '/əˈmʊə/', '/aˈmʊə/']);
  });

  it('falls back to the narrow transcription without a phonemic one', () => {
    expect(parseIpa(page('Steuerberater'), 'German')).toEqual(['[ˈʃtɔɪ̯ɐbəˌʁaːtɐ]']);
  });
});

describe('getWiktionaryPronunciation', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('tries the capitalized page when the lowercase one has no pronunciation', async () => {
    const pages: Record<string, unknown> = {
      liebe: { parse: { title: 'liebe', text: '<div class="mw-heading mw-heading2"><h2 id="German">German</h2></div><p>no audio</p>' } },
      Liebe: { parse: { title: 'Liebe', text: page('Liebe') } },
    };
    globalThis.fetch = jest.fn(async (url: string) => {
      const title = decodeURIComponent(url.split('page=').pop() ?? '');
      return { ok: true, status: 200, json: async () => pages[title] ?? { error: { code: 'missingtitle' } } };
    }) as unknown as typeof fetch;
    const pronunciation = await getWiktionaryPronunciation('liebe', 'German');
    expect(pronunciation?.ipa).toEqual(['/ˈliːbə/']);
    expect(pronunciation?.audio.map((a) => a.title)).toEqual(['De-Liebe2.ogg', 'De-Liebe.ogg']);
  });

  it('resolves an empty list for a missing page and null on failure', async () => {
    globalThis.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ error: { code: 'missingtitle' } }) })) as unknown as typeof fetch;
    expect(await getWiktionaryPronunciation('xyzzy', 'German')).toEqual({ ipa: [], audio: [] });
    globalThis.fetch = jest.fn(async () => ({ ok: false, status: 500 })) as unknown as typeof fetch;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await getWiktionaryPronunciation('qwerty', 'German')).toBeNull();
  });
});

const german = (body: string) => `<div class="mw-heading mw-heading2"><h2 id="German">German</h2></div>${body}`;
const etymology = (body: string) =>
  `<div class="mw-heading mw-heading3"><h3 id="Etymology">Etymology</h3></div><p>${body}\n</p>`;
const mention = (title: string, gloss?: string) =>
  `<i class="Latn mention" lang="de"><a href="/wiki/${encodeURIComponent(title)}#German" title="${title}">${title}</a></i>` +
  (gloss
    ? ` <span class="mention-gloss-paren annotation-paren">(</span><span class="mention-gloss-double-quote">“</span>` +
      `<span class="mention-gloss">${gloss}</span><span class="mention-gloss-double-quote">”</span>` +
      `<span class="mention-gloss-paren annotation-paren">)</span>`
    : '');
const ipaList = (...ipa: string[]) => `<ul><li>IPA: ${ipa.map((i) => `<span class="IPA nowrap">${i}</span>`).join(', ')}</li></ul>`;

describe('parseEtymologyParts', () => {
  it('reads the parts of a compound', () => {
    expect(parseEtymologyParts(page('Steuerberater'), 'German')).toEqual(['Steuer', 'Berater']);
  });

  it('reads a word and its suffix', () => {
    expect(parseEtymologyParts(german(etymology(`${mention('leicht')} +&#8206; ${mention('-igkeit')}`)), 'German')).toEqual(['leicht', '-igkeit']);
  });

  it('ignores words it only comes from', () => {
    const html = german(etymology(`From <span class="etyl">Middle High German</span> <i class="Latn mention" lang="gmh"><a href="/wiki/l%C4%ABhtecheit#Middle_High_German">līhtecheit</a></i>.`));
    expect(parseEtymologyParts(html, 'German')).toEqual([]);
    expect(parseEtymologyParts(german(etymology(`Related to ${mention('leicht')} and ${mention('Licht')}.`)), 'German')).toEqual([]);
  });
});

describe('joinIpa', () => {
  it('stresses the first word of a compound most', () => {
    expect(joinIpa([{ title: 'Steuer', ipa: '/ˈʃtɔɪ̯ɐ/' }, { title: 'Berater', ipa: '/bəˈʁaːtɐ/' }], 'German')).toBe('/ˈʃtɔɪ̯ɐbəˌʁaːtɐ/');
  });

  it('drops a suffix’s hyphen and stresses a one-syllable word', () => {
    expect(joinIpa([{ title: 'leicht', ipa: '/laɪ̯çt/' }, { title: '-igkeit', ipa: '/-ɪçkaɪ̯t/' }], 'German')).toBe('/ˈlaɪ̯çtɪçkaɪ̯t/');
  });

  it('lets a stressed suffix take the stress', () => {
    expect(joinIpa([{ title: 'Bäcker', ipa: '/ˈbɛkɐ/' }, { title: '-ei', ipa: '/-ˈaɪ̯/' }], 'German')).toBe('/bɛkɐˈaɪ̯/');
  });

  it('adds no stress where the language marks none', () => {
    expect(joinIpa([{ title: 'porte', ipa: '/pɔʁt/' }, { title: 'monnaie', ipa: '/mɔ.nɛ/' }], 'French')).toBe('/pɔʁtmɔ.nɛ/');
  });
});

describe('getWiktionaryPronunciation from etymology parts', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });
  const serve = (texts: Record<string, string>) => {
    globalThis.fetch = jest.fn(async (url: string) => {
      const title = decodeURIComponent(url.split('page=').pop() ?? '');
      const text = texts[title];
      return { ok: true, status: 200, json: async () => (text ? { parse: { title, text } } : { error: { code: 'missingtitle' } }) };
    }) as unknown as typeof fetch;
  };

  it('puts Leichtigkeit’s IPA together from leicht and -igkeit', async () => {
    serve({
      Leichtigkeit: german(etymology(`${mention('leicht')} +&#8206; ${mention('-igkeit')}`)),
      leicht: german(ipaList('/laɪ̯çt/')),
      '-igkeit': german(ipaList('/-ɪçkaɪ̯t/')),
    });
    expect(await getWiktionaryPronunciation('Leichtigkeit', 'German')).toEqual({
      ipa: ['/ˈlaɪ̯çtɪçkaɪ̯t/'],
      audio: [],
      derivedFrom: ['leicht', '-igkeit'],
    });
  });

  it('goes one level deeper for a part without IPA', async () => {
    serve({
      Fröhlichkeit: german(etymology(`${mention('fröhlich')} +&#8206; ${mention('-keit')}`)),
      fröhlich: german(etymology(`${mention('froh', 'happy')} +&#8206; ${mention('-lich')}`)),
      froh: german(ipaList('/fʁoː/')),
      '-lich': german(ipaList('/-lɪç/')),
      '-keit': german(ipaList('/kaɪ̯t/', '[kaɪ̯t]')),
    });
    const pronunciation = await getWiktionaryPronunciation('Fröhlichkeit', 'German');
    expect(pronunciation?.ipa).toEqual(['/ˈfʁoːlɪçkaɪ̯t/']);
    expect(pronunciation?.derivedFrom).toEqual(['fröhlich', '-keit']);
  });

  it('gives up when a part has no IPA', async () => {
    serve({
      // Pages are cached across tests, so these are new titles
      Heiterkeit: german(etymology(`${mention('heiter')} +&#8206; ${mention('-kei')}`)),
      heiter: german(ipaList('/ˈhaɪ̯tɐ/')),
    });
    expect(await getWiktionaryPronunciation('Heiterkeit', 'German')).toEqual({ ipa: [], audio: [] });
  });
});
