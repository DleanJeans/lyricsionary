/**
 * Normalizes special apostrophes in text to standard ASCII apostrophe.
 *
 * Replaces various Unicode apostrophe characters with the standard single quote (').
 * This ensures consistent text formatting and better word matching.
 *
 * Examples:
 * - dell\u2032umanit\u00e0 → dell'umanit\u00e0
 * - l\u2032homme → l'homme
 * - It\u2019s → It's (normalized)
 *
 * Characters replaced:
 * - \u2032 Prime - often used as apostrophe
 * - \u2035 Reverse prime
 * - \u2018 Left single quotation mark
 * - \u2019 Right single quotation mark (smart apostrophe)
 * - \u201A Single low-9 quotation mark
 * - \u201B Single high-reversed-9 quotation mark
 * - \u02BC Modifier letter apostrophe
 * - ` Grave accent - sometimes used as apostrophe
 * - \uFF07 Fullwidth apostrophe
 *
 * @param text - The text to normalize
 * @returns Text with all apostrophe variants replaced with standard apostrophe
 */
export function normalizeApostrophes(text: string): string {
  if (!text) return text;

  // Replace all special apostrophe characters with standard apostrophe
  return text.replace(/[\u2032\u2035\u2018\u2019\u201A\u201B\u02BC`\uFF07]/g, "'");
}
