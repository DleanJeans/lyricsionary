// Script to scrape translation from DeepL
const _scrapeTranslationLogic = `
  const url = window.location.href;
  let translation = '';

  // DeepL
  if (url.includes('deepl.com')) {
    const targetTextarea = document.querySelector('[name=target]');
    if (targetTextarea && targetTextarea.value) {
      translation = targetTextarea.value;
      sendTranslation(translation);
      return;
    }
  }

  sendError('Translation not found');
`;

// Bootstrap: defines helpers and runs the logic
export const scrapeTranslationJS = `
  (function() {
    const consoleLog = (log) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', log }));
    };
    const sendTranslation = (text) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'translation', text, title: document.title }));
    };
    const sendError = (err) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: err && err.message ? err.message : String(err) }));
    };
    try {
      (new Function('consoleLog', 'sendTranslation', ${JSON.stringify(_scrapeTranslationLogic)}))(consoleLog, sendTranslation);
    } catch (e) {
      sendError(e);
    }
  })();
  true;
`;
