// Scrapes IPA (International Phonetic Alphabet) pronunciations from Wiktionary
// Injects JavaScript to find all IPA elements within the specified language section
export const getScrapeIpaJS = (language: string) => {
  const _scrapeIpaLogic = `
    const ipaElements = Array.from(document.querySelectorAll('div:has(#${language}) + section li .IPA'));
    const ipaResults = ipaElements
      .map(ipa => ipa.textContent)
      .filter(text => text && text.includes('/'))
      .map(text => text.trim());

    if (ipaResults.length > 0) {
      sendIpa(ipaResults);
    } else {
      // sendError('No IPA pronunciations found');
    }
  `;

  // Bootstrap: defines helpers and runs the logic via new Function so syntax errors are catchable.
  return `
    (function() {
      const consoleLog = (log) => {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', log }));
      };
      const sendIpa = (results) => {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ipa', results }));
      };
      const sendError = (err) => {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ipaError', message: err && err.message ? err.message : String(err) }));
      };
      try {
        (new Function('consoleLog', 'sendIpa', 'sendError', ${JSON.stringify(_scrapeIpaLogic)}))(consoleLog, sendIpa, sendError);
      } catch (e) {
        sendError(e);
      }
    })();
    true;
  `;
};
