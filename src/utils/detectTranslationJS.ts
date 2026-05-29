// Script to detect if DeepL translation is complete
// This is injected on page load to determine if the Get Translation button should be shown
const _detectTranslationLogic = `
  let lastSentState = false;

  const checkTranslation = () => {
    const targetTextarea = document.querySelector('[name=target]');
    const hasTranslation = targetTextarea && targetTextarea.value && targetTextarea.value.trim().length > 0;

    // Only send update if state changed
    if (hasTranslation !== lastSentState) {
      lastSentState = hasTranslation;
      sendDetectionResult(hasTranslation);
    }
  };

  // Initial check
  checkTranslation();

  // Set up MutationObserver to watch for changes
  const targetTextarea = document.querySelector('[name=target]');
  if (targetTextarea) {
    // Watch for changes to the textarea's value attribute
    const observer = new MutationObserver(() => {
      checkTranslation();
    });

    observer.observe(targetTextarea, {
      attributes: true,
      attributeFilter: ['value'],
      characterData: true,
      subtree: true
    });

    // Also listen to input events which are more reliable for textarea changes
    targetTextarea.addEventListener('input', checkTranslation);

    // Periodically check as a fallback (every 1 second)
    setInterval(checkTranslation, 1000);
  }
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
