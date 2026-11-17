import { LYRICS_SITE_DOMAINS } from './nowPlaying';

// Script for the automatic lyrics flow: when a Google results page has no lyrics panel,
// list the supported lyrics sites found in the results.
export const followLyricsLinkJS = `
  (function() {
    try {
      if (document.querySelector('div[data-lyricid]')) return;
      const domains = ${JSON.stringify(LYRICS_SITE_DOMAINS)};
      const sites = [];
      const seen = {};
      Array.from(document.querySelectorAll('a[href]')).forEach((a) => {
        try {
          let u = new URL(a.href);
          // Google may wrap results as /url?q=<target>
          if (u.hostname.indexOf('google.') !== -1 && u.pathname === '/url') {
            u = new URL(u.searchParams.get('q') || u.searchParams.get('url'));
          }
          const host = u.hostname.replace(/^www\\./, '');
          const domain = domains.find((d) => host === d || host.endsWith('.' + d));
          if (!domain || seen[domain]) return;
          seen[domain] = true;
          const title = (a.querySelector('h3') || a).innerText || '';
          sites.push({ domain: domain, url: u.href, title: title.trim().split('\\n')[0] });
        } catch (e) {}
      });
      if (sites.length) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'lyricsSites', sites: sites }));
      } else {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'No lyrics found for this song' }));
      }
    } catch (e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: e.message }));
    }
  })();
  true;
`;
