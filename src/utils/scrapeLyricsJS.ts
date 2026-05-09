export const scrapeLyricsJS = `
  (function() {
    const consoleLog = (log) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', log }));
    };
    const sendLyrics = (text) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'lyrics', text, title: document.title }));
    };

    const url = window.location.href;
    let lyrics = '';

    // Google
    if (url.includes('google.com')) {
      var paragraphs = document.querySelectorAll('div[data-lyricid] div[class][jsname]');
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
        sendLyrics(lyrics);
        return;
      }
    }

    // Genius
    if (url.includes('genius.com')) {
      var genius = document.querySelectorAll('[data-lyrics-container="true"]');
      if (genius.length > 0) {
        genius.forEach(el => { lyrics += el.innerText + '\\n'; });
        sendLyrics(lyrics);
        return;
      }
    }

    // Musixmatch
    if (url.includes('musixmatch.com')) {
      var musix = document.querySelector('h2[style="color: var(--mxm-contentSecondary);"]:not([data-testid]) + div')?.innerText;
      if (musix && musix.length > 0) {
        sendLyrics(musix);
        return;
      }
    }

    // LyricsTranslate
    if (url.includes('lyricstranslate.com')) {
      const lt = document.querySelectorAll('.ltf, .song-node');
      if (lt.length > 0) {
        lt.forEach(el => { lyrics += el.innerText + '\\n'; });
        sendLyrics(lyrics);
        return;
      }
    }

    // Generic fallback
    consoleLog(window.location.hostname, 'Using fallback - scraping entire page text');
    const body = document.body.innerText;
    sendLyrics(body.substring(0, 5000));
  })();
  true;
`;
