const API_URL = 'https://en.wiktionary.org/w/api.php?action=query&format=json&formatversion=2&origin=*&titles=';

// One request per word for the whole session; failed requests are retried next time
const entryChecks = new Map<string, Promise<boolean | null>>();

/** Whether the API response says the page is missing ("Wiktionary does not yet have an entry for ...") */
export function isMissingPage(response: unknown): boolean {
  const page = (response as { query?: { pages?: { missing?: boolean; invalid?: boolean }[] } })?.query?.pages?.[0];
  return !!page && (!!page.missing || !!page.invalid);
}

/**
 * Check whether Wiktionary has a page for the word (titles are case-sensitive, so "liebe" and
 * "Liebe" are different pages). Resolves null when the check fails, e.g. offline.
 */
export function hasWiktionaryEntry(word: string): Promise<boolean | null> {
  const cached = entryChecks.get(word);
  if (cached) return cached;

  const check = fetch(API_URL + encodeURIComponent(word))
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((json) => !isMissingPage(json))
    .catch(() => {
      entryChecks.delete(word);
      return null;
    });
  entryChecks.set(word, check);
  return check;
}
