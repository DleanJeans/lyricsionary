/**
 * A word's pronunciation can hold more than one IPA, separated by commas, e.g. "/ˈʃaɪ̯sˌkalt/, /ˌʃaɪ̯sˈkalt/".
 * IPA itself never has a comma in it.
 */
export function splitIpas(pronunciation: string | undefined): string[] {
  return (pronunciation ?? '').split(/\s*,\s*/).map((ipa) => ipa.trim()).filter(Boolean);
}

/** The first of a pronunciation's IPAs, the one shown above a word and quizzed */
export function firstIpa(pronunciation: string | undefined): string {
  return splitIpas(pronunciation)[0] ?? '';
}

/** The pronunciation with `ipa` added after the ones it has, unless it has it already */
export function addIpa(pronunciation: string, ipa: string): string {
  const ipas = splitIpas(pronunciation);
  const bare = (s: string) => s.replace(/[/[\]]/g, '').trim();
  if (ipas.some((existing) => bare(existing) === bare(ipa))) return pronunciation;
  return [...ipas, ipa.trim()].join(', ');
}
