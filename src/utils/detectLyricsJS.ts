// Script to detect if lyrics are present on a page without extracting them
// This is injected on page load to determine if the Get Lyrics button should be shown
const _detectLyricsLogic = `
  const url = window.location.href;
  let hasLyrics = false;

  // Google
  if (url.includes('google.com')) {
    const paragraphs = document.querySelectorAll('div[data-lyricid] div[class][jsname]');
    hasLyrics = paragraphs.length > 0;
  }
  // Genius
  else if (url.includes('genius.com')) {
    const genius = document.querySelectorAll('[data-lyrics-container="true"]');
    hasLyrics = genius.length > 0;
  }
  // Musixmatch
  else if (url.includes('musixmatch.com')) {
    const checkMusixmatch = () => {
      // A translation page's lyrics may not match the selector below; its page data has them.
      // The data is stale after client-side navigation, so it only counts on the song it's for
      try {
        const nextData = window.__NEXT_DATA__;
        const trackVanityId = nextData.query.trackVanityId;
        if (trackVanityId && window.location.pathname.includes('/' + trackVanityId) && nextData.props.pageProps.data.trackInfo.data.lyrics.body) return true;
      } catch (e) {}
      const musix = document.querySelector('h2[style="color: var(--mxm-contentSecondary);"]:not([data-testid]) + div');
      return musix && musix.innerText && musix.innerText.length > 0;
    };
    hasLyrics = checkMusixmatch();
    if (!hasLyrics) {
      const observer = new MutationObserver(() => {
        if (checkMusixmatch()) {
          observer.disconnect();
          sendDetectionResult(true);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 5000);
    }
  }
  // SongLyrics.com
  else if (url.includes('songlyrics.com')) {
    const songLyricsEl = document.querySelector('#songLyricsDiv');
    hasLyrics = !!songLyricsEl;
  }
  // Lyricsify
  else if (url.includes('lyricsify.com')) {
    hasLyrics = !!document.querySelector('#lyrics_display');
  }
  // Paroles-Musique: only a teaser shows until "Click to see full lyrics..." is tapped
  else if (url.includes('paroles-musique.com')) {
    const fullLyricsButton = () => document.querySelector('#lyrics div[id] button');
    const button = fullLyricsButton();
    hasLyrics = !!document.querySelector('#lyrics div[id]') && !button;
    if (button) {
      button.click();
      const observer = new MutationObserver(() => {
        if (document.querySelector('#lyrics div[id]') && !fullLyricsButton()) {
          observer.disconnect();
          sendDetectionResult(true);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 5000);
    }
  }
  // LyricsTranslate: original lyrics, or a translation whose original can be toggled on
  else if (url.includes('lyricstranslate.com')) {
    hasLyrics = !!document.querySelector('#original-lyrics, #translation-body');
  }

  sendDetectionResult(hasLyrics);
`;

// Bootstrap: defines helpers and runs the logic
export const detectLyricsJS = `
  (function() {
    const sendDetectionResult = (hasLyrics) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'lyricsDetected', hasLyrics }));
    };
    try {
      (new Function('sendDetectionResult', ${JSON.stringify(_detectLyricsLogic)}))(sendDetectionResult);
    } catch (e) {
      // Silently fail detection - button won't show
    }
  })();
  true;
`;
