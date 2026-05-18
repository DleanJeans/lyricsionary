/**
 * Generates JavaScript to paste text into DeepL's source textarea
 * @param text - The text to paste into DeepL
 */
export function pasteIntoDeepLJS(text: string): string {
  return `
    (function() {
      const sourceTextarea = document.querySelector('[name=source]');
      if (sourceTextarea) {
        // Set value and trigger input event to make DeepL recognize the change
        sourceTextarea.value = ${JSON.stringify(text)};
        sourceTextarea.dispatchEvent(new Event('input', { bubbles: true }));

        // Also try setting the textContent if it's a contenteditable element
        if (sourceTextarea.contentEditable === 'true') {
          sourceTextarea.textContent = ${JSON.stringify(text)};
        }
      }
    })();
    true;
  `;
}
