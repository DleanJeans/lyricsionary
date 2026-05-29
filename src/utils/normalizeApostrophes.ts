/**
 * Normalizes special apostrophes in text to standard ASCII apostrophe.
 *
 * Replaces various Unicode apostrophe characters with the standard single quote (').
 * This ensures consistent text formatting and better word matching.
 *
 * Examples:
 * - dell′umanità → dell'umanità
 * - l′homme → l'homme
 * - It's → It's (no change)
 *
 * Characters replaced:
 * - ′ (U+2032) Prime - often used as apostrophe
 * - ' (U+2018) Left single quotation mark
 * - ' (U+2019) Right single quotation mark (smart apostrophe)
 * - ‚ (U+201A) Single low-9 quotation mark
 * - ‛ (U+201B) Single high-reversed-9 quotation mark
 * - ` (U+0060) Grave accent - sometimes used as apostrophe
 *
 * @param text - The text to normalize
 * @returns Text with all apostrophe variants replaced with standard apostrophe
 */
export function normalizeApostrophes(text: string): string {
  if (!text) return text;

  // Replace all special apostrophe characters with standard apostrophe
  // This regex matches various Unicode apostrophe-like characters
  return text.replace(/[′''‚‛`]/g, "'");
}
