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
    const musix = document.querySelector('h2[style="color: var(--mxm-contentSecondary);"]:not([data-testid]) + div');
    hasLyrics = musix && musix.innerText && musix.innerText.length > 0;
  }
  // SongLyrics.com
  else if (url.includes('songlyrics.com')) {
    const songLyricsEl = document.querySelector('#songLyricsDiv');
    hasLyrics = !!songLyricsEl;
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
