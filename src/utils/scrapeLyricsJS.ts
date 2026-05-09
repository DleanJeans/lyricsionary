export const scrapeLyricsJS = `
  const consoleLog = (log) => {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', log }));
  };

  (function() {
    const url = window.location.href;
    let lyrics = '';

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
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'lyrics', text: lyrics }));
        return;
      }
    }

    // Genius
    if (url.includes('genius.com')) {
      const genius = document.querySelectorAll('[data-lyrics-container="true"]');
      if (genius.length > 0) {
        genius.forEach(el => { lyrics += el.innerText + '\\n'; });
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'lyrics', text: lyrics }));
        return;
      }
    }

    // Musixmatch
    if (url.includes('musixmatch.com')) {
      const musix = document.querySelectorAll('.lyrics__content__ok, .mxm-lyrics__content');
      if (musix.length > 0) {
        musix.forEach(el => { lyrics += el.innerText + '\\n'; });
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'lyrics', text: lyrics }));
        return;
      }
    }

    // LyricsTranslate
    if (url.includes('lyricstranslate.com')) {
      const lt = document.querySelectorAll('.ltf, .song-node');
      if (lt.length > 0) {
        lt.forEach(el => { lyrics += el.innerText + '\\n'; });
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'lyrics', text: lyrics }));
        return;
      }
    }

    // Generic fallback
    consoleLog('Using fallback - scraping entire page text');
    const body = document.body.innerText;
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'lyrics', text: body.substring(0, 5000) }));
  })();
  true;
`;
