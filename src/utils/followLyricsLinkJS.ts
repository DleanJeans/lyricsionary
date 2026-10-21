import { LYRICS_SITE_DOMAINS } from './nowPlaying';

// Script for the automatic lyrics flow: when a Google results page has no lyrics panel,
// open the first result from a supported lyrics site instead.
export const followLyricsLinkJS = `
  (function() {
    try {
      if (document.querySelector('div[data-lyricid]')) return;
      const domains = ${JSON.stringify(LYRICS_SITE_DOMAINS)};
      const links = Array.from(document.querySelectorAll('a[href]'));
      const link = links.find((a) => {
        try {
          const host = new URL(a.href).hostname;
          return domains.some((d) => host === d || host.endsWith('.' + d));
        } catch (e) {
          return false;
        }
      });
      if (link) {
        window.location.href = link.href;
      } else {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'No lyrics found for this song' }));
      }
    } catch (e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: e.message }));
    }
  })();
  true;
`;
