import { scrapeTranslationJS } from '../src/utils/scrapeTranslationJS';

// Runs the injected script against a fake page, returning the messages it posts
function runScript(href: string, elements: Record<string, { value?: string; innerText?: string }> = {}) {
  const messages: Record<string, unknown>[] = [];
  const globals = globalThis as Record<string, unknown>;
  globals.window = {
    location: { href },
    ReactNativeWebView: { postMessage: (message: string) => messages.push(JSON.parse(message)) },
  };
  globals.document = { title: 'Page', querySelector: (selector: string) => elements[selector] ?? null };
  try {
    // biome-ignore lint/security/noGlobalEval: the script is a string meant for a WebView
    eval(scrapeTranslationJS);
  } finally {
    delete globals.window;
    delete globals.document;
  }
  return messages;
}

describe('scrapeTranslationJS', () => {
  it('reports a missing translation', () => {
    expect(runScript('https://example.com')).toEqual([{ type: 'error', message: 'Translation not found' }]);
  });

  it('reads the DeepL translation', () => {
    expect(runScript('https://www.deepl.com/translator', { '[name=target]': { value: 'Hello' } })).toEqual([
      { type: 'translation', text: 'Hello', title: 'Page' },
    ]);
  });
});
