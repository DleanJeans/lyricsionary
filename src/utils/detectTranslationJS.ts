// Script to detect if DeepL translation is complete
// This is injected on page load to determine if the Get Translation button should be shown
const _detectTranslationLogic = `
  const url = window.location.href;
  let hasTranslation = false;

  // DeepL
  if (url.includes('deepl.com')) {
    const targetTextarea = document.querySelector('[name=target]');
    if (targetTextarea && targetTextarea.value && targetTextarea.value.trim().length > 0) {
      hasTranslation = true;
    }
  }

  sendDetectionResult(hasTranslation);
`;

// Bootstrap: defines helpers and runs the logic
export const detectTranslationJS = `
  (function() {
    const sendDetectionResult = (hasTranslation) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'translationDetected', hasTranslation }));
    };
    try {
      (new Function('sendDetectionResult', ${JSON.stringify(_detectTranslationLogic)}))(sendDetectionResult);
    } catch (e) {
      // Silently fail detection - button won't show
    }
  })();
  true;
`;
