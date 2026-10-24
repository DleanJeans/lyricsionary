import { scrapeLyricsJS } from '../src/utils/scrapeLyricsJS';

type FakeElement = { innerText?: string; textContent?: string; lang?: string };

// Runs the injected script against a fake page, returning the messages it posts
function runScript(href: string, elements: Record<string, FakeElement>) {
  const messages: Record<string, unknown>[] = [];
  const globals = globalThis as Record<string, unknown>;
  globals.window = {
    location: { href, hostname: new URL(href).hostname },
    ReactNativeWebView: { postMessage: (message: string) => messages.push(JSON.parse(message)) },
  };
  globals.document = {
    title: 'Page',
    body: { innerText: '' },
    querySelector: (selector: string) => elements[selector] ?? null,
    querySelectorAll: () => [],
  };
  try {
    // biome-ignore lint/security/noGlobalEval: the script is a string meant for a WebView
    eval(scrapeLyricsJS);
  } finally {
    delete globals.window;
    delete globals.document;
  }
  return messages;
}

describe('scrapeLyricsJS', () => {
  it('sends LyricsTranslate lyrics with their translation', () => {
    const messages = runScript('https://lyricstranslate.com/en/bon-dia-good-morning.html', {
      '#original-lyrics': { innerText: 'Bon dia', lang: 'ca' },
      '#translation-body': { innerText: 'Good morning' },
      '.lt-breadcrumb-item:last-child': { textContent: ' English translation ' },
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

  it('sends SongLyrics.com lyrics without a translation', () => {
    const messages = runScript('https://www.songlyrics.com/a/b', { '#songLyricsDiv': { innerText: 'La la' } });
    expect(messages).toEqual([{ type: 'lyrics', text: 'La la', title: 'Page', languageCode: '' }]);
  });
});
