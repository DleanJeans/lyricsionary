/**
 * IPA as shown above a word in Learn: wrapped in slashes unless it already has its own
 * slashes or brackets, e.g. "bɔ̃.ʒuʁ" -> "/bɔ̃.ʒuʁ/", or bare without them, e.g. "[ʃtɔʏ̯ɐ]" -> "ʃtɔʏ̯ɐ".
 */
export function formatIpa(ipa: string, showBrackets: boolean): string {
  const trimmed = ipa.trim();
  if (!showBrackets) return trimmed.replace(/[/[\]]/g, '').trim();
  return /[/[\]]/.test(trimmed) ? trimmed : `/${trimmed}/`;
}
