// Edit scraping logic here freely — syntax errors will be caught and shown as a toast.
// consoleLog and sendLyrics are available as parameters from the outer bootstrap.
const _scrapeLyricsLogic = `
  const url = window.location.href;
  let lyrics = '';
  let languageCode = '';

  // Google
  if (url.includes('google.com')) {
    const paragraphs = document.querySelectorAll('div[data-lyricid] div[class][jsname]');
    if (paragraphs.length > 0) {
      let lyricsJsname = '';
      paragraphs.forEach(p => {
        const pJsname = p.getAttribute('jsname');
        if (!lyricsJsname) {
          lyricsJsname = pJsname;
        } else if (pJsname !== lyricsJsname) {
          return;
        }
        lyrics += p.innerText + '\\n\\n';
      });

      // won't work if Google language is not set to English
      const langCodeEl = document.querySelector('[data-lang-code-from]');
      if (langCodeEl) {
        languageCode = langCodeEl.getAttribute('data-lang-code-from') || '';
      }
      sendLyrics(lyrics, languageCode);
      return;
    }
  }

  // Genius
  if (url.includes('genius.com')) {
    const genius = document.querySelectorAll('[data-lyrics-container="true"]');
    if (genius.length > 0) {
      genius.forEach(el => { lyrics += el.innerText + '\\n'; });
      // Extract language from Genius preloaded state
      try {
        languageCode = window.__PRELOADED_STATE__.songPage.trackingData["Lyrics Language"] || '';
      } catch (e) {
        consoleLog('Failed to extract language from Genius: ' + e.message);
      }
      sendLyrics(lyrics, languageCode);
      return;
    }
  }

  // Musixmatch: a translation page has crowdTranslationGet, a map from each original line to its
  // translation. __NEXT_DATA__ goes stale on client-side navigation, so read it from a fresh copy of the page
  if (url.includes('musixmatch.com')) {
    const sendFromNextData = (nextData) => {
      const pageProps = nextData.props.pageProps;
      const mLyrics = pageProps.data.trackInfo.data.lyrics;
      const lineTranslations = pageProps.data.crowdTranslationGet?.data;
      if (!lineTranslations || typeof lineTranslations !== 'object' || !Object.keys(lineTranslations).length) {
        sendLyrics(mLyrics.body, mLyrics.language);
        return;
      }
      // Keys mix ′ and ' apostrophes, sometimes differently from the lyrics body
      const normalize = (line) => line.replace(/[′’‘]/g, "'").trim();
      const byLine = {};
      Object.keys(lineTranslations).forEach((line) => { byLine[normalize(line)] = lineTranslations[line]; });
      // Keep one line per original line so the tabs line up; an untranslated line stays as it is
      const translation = mLyrics.body
        .split('\\n')
        .map((line) => (line.trim() ? byLine[normalize(line)] ?? line : ''))
        .join('\\n');
      sendLyrics(mLyrics.body, mLyrics.language, {
        translation,
        translationLanguage: pageProps.analyticsData?.destination_languge || nextData.query?.language || '',
      });
    };
    const sendFromDocument = () => {
      try {
        sendFromNextData(__NEXT_DATA__);
        return;
      } catch (e) {
        consoleLog('Failed to extract from __NEXT_DATA__: ' + e.message);
      }
      // Fallback to old scraping method
      const musix = document.querySelector('h2[style="color: var(--mxm-contentSecondary);"]:not([data-testid]) + div')?.innerText;
      sendLyrics(musix || document.body.innerText.substring(0, 5000), languageCode);
    };
    fetch(url)
      .then((response) => response.text())
      .then((html) => {
        const json = new DOMParser().parseFromString(html, 'text/html').querySelector('#__NEXT_DATA__')?.textContent;
        sendFromNextData(JSON.parse(json));
      })
      .catch((e) => {
        consoleLog('Failed to read a fresh Musixmatch page: ' + e.message);
        sendFromDocument();
      });
    return;
  }

  // SongLyrics.com
  if (url.includes('songlyrics.com')) {
    const songLyricsEl = document.querySelector('#songLyricsDiv');
    if (songLyricsEl) {
      sendLyrics(songLyricsEl.innerText, languageCode);
      return;
    }
  }

  // Lyricsify: the page keeps the whole LRC file in a global lrcText and renders it with JS
  if (url.includes('lyricsify.com')) {
    let lrc = '';
    try {
      if (typeof lrcText === 'string') lrc = lrcText;
    } catch (e) {
      consoleLog('Failed to read lrcText from Lyricsify: ' + e.message);
    }
    if (!lrc) lrc = document.querySelector('#lyrics_display')?.innerText || '';
    if (lrc) {
      // Same as Lyricsify's own "Plain Text" mode: drop [ar: ...] tags and timestamps
      lyrics = lrc
        .replace(/^\\s*\\[[a-z_-]+:.*\\]\\s*$/gim, '')
        .replace(/\\[[\\d:.]+\\]|<[\\d:.]+>/g, '')
        .replace(/\\n{3,}/g, '\\n\\n');
      sendLyrics(lyrics, languageCode);
      return;
    }
  }

  // Paroles-Musique: detection taps "Click to see full lyrics..." first, so the full text is here.
  // Lines end in <br>, ads sit mid-line between <br>s, and source newlines aren't line breaks
  if (url.includes('paroles-musique.com')) {
    const lyricsEl = document.querySelector('#lyrics div[id]');
    if (lyricsEl) {
      const clone = lyricsEl.cloneNode(true);
      const siblingBr = (node, dir) => {
        let n = node[dir];
        while (n && n.nodeType === 3 && !n.textContent.trim()) n = n[dir];
        return n && n.nodeName === 'BR' ? n : null;
      };
      clone.querySelectorAll('.ads_cont').forEach((ad) => {
        siblingBr(ad, 'previousSibling')?.remove();
        siblingBr(ad, 'nextSibling')?.remove();
        ad.remove();
      });
      clone.querySelectorAll('script, ins, button').forEach((el) => el.remove());
      const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) walker.currentNode.textContent = walker.currentNode.textContent.replace(/\\s+/g, ' ');
      clone.querySelectorAll('br').forEach((br) => br.replaceWith('\\n'));
      lyrics = clone.textContent
        .split('\\n')
        .map((line) => line.replace(/ {2,}/g, ' ').trim())
        .join('\\n')
        .trim();
      // The full lyrics double every <br>; halve them so lines aren't all blank-line separated
      if (!/[^\\n]\\n[^\\n]/.test(lyrics)) lyrics = lyrics.replace(/\\n\\n/g, '\\n');
      const languageMatch = document.querySelector('#lyrics .lf_info')?.textContent.match(/is a song in (\\w+)/);
      if (languageMatch) languageCode = languageMatch[1];
      sendLyrics(lyrics, languageCode);
      return;
    }
  }

  // Letras: a translation page stacks each translated line over its original (.romanization),
  // in a paragraph per stanza
  if (url.includes('letras.com') || url.includes('letras.mus.br')) {
    const stanzas = [...document.querySelectorAll('.lyric-translation p')].filter((p) => p.querySelector('.verse'));
    if (stanzas.length > 0) {
      const originals = [];
      const translations = [];
      stanzas.forEach((p) => {
        p.querySelectorAll('.verse').forEach((verse) => {
          const original = verse.querySelector('.romanization');
          const translated = [...verse.children].find((child) => child !== original);
          originals.push(original ? original.textContent.trim() : '');
          translations.push(translated ? translated.textContent.trim() : '');
        });
        originals.push('');
        translations.push('');
      });
      // The song's language is only in the page's analytics, e.g. "SongLanguage":"fr"
      const scripts = [...document.querySelectorAll('script:not([src])')].map((script) => script.textContent).join('\\n');
      languageCode = scripts.match(/"SongLanguage":"([\\w-]+)"/)?.[1] || '';
      // Each translation page is the alternate link for its language
      const path = window.location.pathname;
      const alternate = [...document.querySelectorAll('link[rel=alternate][hreflang]')].find((link) => {
        try {
          return new URL(link.href).pathname === path;
        } catch (e) {
          return false;
        }
      });
      sendLyrics(originals.join('\\n').trim(), languageCode, {
        translation: translations.join('\\n').trim(),
        translationLanguage: alternate?.getAttribute('hreflang') || document.documentElement.lang || '',
      });
      return;
    }
  }

  // LyricsTranslate: a translation page shows the original next to the translation, which is sent
  // along to fill in the translation tab. The original can be hidden behind a toggle.
  if (url.includes('lyricstranslate.com')) {
    const send = () => {
      const originalEl = document.querySelector('#original-lyrics');
      const translationEl = document.querySelector('#translation-body');
      if (!originalEl && !translationEl) return false;
      sendLyrics(originalEl ? originalEl.innerText : '', originalEl ? originalEl.lang : '', {
        translation: translationEl ? translationEl.innerText : '',
        translationLanguage: document.querySelector('.lt-breadcrumb-item:last-child')?.textContent.trim() || '',
      });
      return true;
    };
    const originalToggle = document.querySelector('[data-target=original]');
    if (!document.querySelector('#original-lyrics') && originalToggle) {
      originalToggle.click();
      let observer;
      const timer = setTimeout(() => {
        observer.disconnect();
        send();
      }, 3000);
      observer = new MutationObserver(() => {
        if (!document.querySelector('#original-lyrics')) return;
        observer.disconnect();
        clearTimeout(timer);
        send();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return;
    }
    if (send()) return;
  }

  // Generic fallback
  consoleLog(window.location.hostname + ' - Using fallback, scraping entire page text');
  const body = document.body.innerText;
  sendLyrics(body.substring(0, 5000), languageCode);
`;

// Bootstrap: defines helpers and runs the logic via new Function so syntax errors are catchable.
export const scrapeLyricsJS = `
  (function() {
    const consoleLog = (log) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', log }));
    };
    // extra: { translation, translationLanguage } when the page has a translation too
    const sendLyrics = (text, languageCode, extra) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'lyrics', text, title: document.title, languageCode: languageCode || '', ...extra }));
    };
    const sendError = (err) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: err && err.message ? err.message : String(err) }));
    };
    try {
      (new Function('consoleLog', 'sendLyrics', ${JSON.stringify(_scrapeLyricsLogic)}))(consoleLog, sendLyrics);
    } catch (e) {
      sendError(e);
    }
  })();
  true;
`;
