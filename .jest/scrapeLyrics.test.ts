import { scrapeLyricsJS } from '../src/utils/scrapeLyricsJS';

type FakeElement = {
  innerText?: string;
  textContent?: string;
  lang?: string;
  href?: string;
  children?: FakeElement[];
  getAttribute?: (name: string) => string | null;
  querySelector?: (selector: string) => FakeElement | null;
  querySelectorAll?: (selector: string) => FakeElement[];
};
type FakePage = {
  elements?: Record<string, FakeElement>;
  lists?: Record<string, FakeElement[]>;
  globals?: Record<string, unknown>;
};

// Runs the injected script against a fake page, returning the messages it posts once its promises settle
async function runScript(href: string, { elements = {}, lists = {}, globals: pageGlobals = {} }: FakePage) {
  const messages: Record<string, unknown>[] = [];
  const globals = globalThis as Record<string, unknown>;
  const { pathname, hostname } = new URL(href);
  const saved = Object.fromEntries(Object.keys(pageGlobals).map((key) => [key, globals[key]]));
  Object.assign(globals, pageGlobals);
  globals.window = {
    location: { href, hostname, pathname },
    ReactNativeWebView: { postMessage: (message: string) => messages.push(JSON.parse(message)) },
  };
  globals.document = {
    title: 'Page',
    body: { innerText: '' },
    documentElement: { lang: '' },
    querySelector: (selector: string) => elements[selector] ?? null,
    querySelectorAll: (selector: string) => lists[selector] ?? [],
  };
  try {
    // biome-ignore lint/security/noGlobalEval: the script is a string meant for a WebView
    eval(scrapeLyricsJS);
    await new Promise((resolve) => setTimeout(resolve, 0));
  } finally {
    delete globals.window;
    delete globals.document;
    Object.assign(globals, saved);
  }
  return messages;
}

// A Letras line: the translation over its original in a .verse span
function letrasVerse(translation: string, original: string): FakeElement {
  const originalEl = { textContent: original };
  const children = [{ textContent: translation }, originalEl];
  return { children, querySelector: (selector) => (selector === '.romanization' ? originalEl : null) };
}

function letrasStanza(...verses: FakeElement[]): FakeElement {
  return { querySelector: () => verses[0] ?? null, querySelectorAll: () => verses };
}

describe('scrapeLyricsJS', () => {
  it('sends LyricsTranslate lyrics with their translation', async () => {
    const messages = await runScript('https://lyricstranslate.com/en/bon-dia-good-morning.html', {
      elements: {
        '#original-lyrics': { innerText: 'Bon dia', lang: 'ca' },
        '#translation-body': { innerText: 'Good morning' },
        '.lt-breadcrumb-item:last-child': { textContent: ' English translation ' },
      },
    });
    expect(messages).toEqual([
      {
        type: 'lyrics',
        text: 'Bon dia',
        title: 'Page',
        languageCode: 'ca',
        translation: 'Good morning',
        translationLanguage: 'English translation',
      },
    ]);
  });

  it('sends SongLyrics.com lyrics without a translation', async () => {
    const messages = await runScript('https://www.songlyrics.com/a/b', { elements: { '#songLyricsDiv': { innerText: 'La la' } } });
    expect(messages).toEqual([{ type: 'lyrics', text: 'La la', title: 'Page', languageCode: '' }]);
  });

  it('sends Musixmatch lyrics with their translation, line by line', async () => {
    const nextData = {
      query: { language: 'english' },
      props: {
        pageProps: {
          analyticsData: { destination_languge: 'english' },
          data: {
            trackInfo: { data: { lyrics: { body: 'Il est minuit\nJ′croyais\n\nRien', language: 'fr' } } },
            crowdTranslationGet: { data: { 'Il est minuit': "It's midnight", "J'croyais": 'I thought' } },
          },
        },
      },
    };
    // The fresh copy of the page can't be parsed here, so the page's own data is used
    const messages = await runScript('https://www.musixmatch.com/lyrics/A/minuit/translation/english', {
      globals: { __NEXT_DATA__: nextData, fetch: () => Promise.reject(new Error('offline')) },
    });
    expect(messages.filter((m) => m.type === 'lyrics')).toEqual([
      {
        type: 'lyrics',
        text: 'Il est minuit\nJ′croyais\n\nRien',
        title: 'Page',
        languageCode: 'fr',
        translation: "It's midnight\nI thought\n\nRien",
        translationLanguage: 'english',
      },
    ]);
  });

  it('sends Letras lyrics with their translation', async () => {
    const messages = await runScript('https://www.letras.com/oscar-anton/minuit/english.html', {
      lists: {
        '.lyric-translation p': [
          letrasStanza(letrasVerse("It's midnight", 'Il est minuit'), letrasVerse('Once again', 'Encore une fois')),
          letrasStanza(letrasVerse('Just once', "Rien qu'une fois")),
        ],
        'script:not([src])': [{ textContent: '_omq.push([\'ui/lyric\', {"Name":"Minuit","SongLanguage":"fr"}]);' }],
        'link[rel=alternate][hreflang]': [
          { href: 'https://www.letras.com/oscar-anton/minuit/traduccion.html', getAttribute: () => 'es' },
          { href: 'https://www.letras.com/oscar-anton/minuit/english.html', getAttribute: () => 'en' },
        ],
      },
    });
    expect(messages).toEqual([
      {
        type: 'lyrics',
        text: "Il est minuit\nEncore une fois\n\nRien qu'une fois",
        title: 'Page',
        languageCode: 'fr',
        translation: "It's midnight\nOnce again\n\nJust once",
        translationLanguage: 'en',
      },
    ]);
  });
});
