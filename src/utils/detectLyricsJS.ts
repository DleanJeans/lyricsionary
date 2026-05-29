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
  // LyricsTranslate
  else if (url.includes('lyricstranslate.com')) {
    const originalTab = document.querySelector('[data-target=original]');
    if (originalTab) originalTab.click();
    const originalLyricsEl = document.querySelector('#original-lyrics');
    hasLyrics = !!originalLyricsEl && originalLyricsEl.textContent.trim().length > 0;
    const translationBody = document.querySelector('#translation-body');
    if (translationBody && translationBody.textContent.trim().length > 0) {
      sendTranslationDetection(true);
    }
  }

  sendDetectionResult(hasLyrics);
`;

// Bootstrap: defines helpers and runs the logic
export const detectLyricsJS = `
  (function() {
    const sendDetectionResult = (hasLyrics) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'lyricsDetected', hasLyrics }));
    };
    const sendTranslationDetection = (hasTranslation) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'translationDetected', hasTranslation }));
    };
    try {
      (new Function('sendDetectionResult', 'sendTranslationDetection', ${JSON.stringify(_detectLyricsLogic)}))(sendDetectionResult, sendTranslationDetection);
    } catch (e) {
      // Silently fail detection - button won't show
    }
  })();
  true;
`;
