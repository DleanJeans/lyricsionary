const API_URL = 'https://en.wiktionary.org/w/api.php?action=query&format=json&formatversion=2&origin=*&titles=';

// Wikimedia rejects requests with generic user agents (e.g. okhttp on Android), so send the device's
// own WebView one; browsers already send theirs
let userAgent: Promise<string | null> | undefined;
function getUserAgent(): Promise<string | null> {
  if (typeof document !== 'undefined') return Promise.resolve(null);
  // Imported lazily so the response parsing below stays testable without React Native
  userAgent ??= import('expo-constants')
    .then(({ default: Constants }) => Constants.getWebViewUserAgentAsync())
    .catch(() => null);
  return userAgent;
}

// One request per word for the whole session; failed requests are retried next time
const entryChecks = new Map<string, Promise<boolean | null>>();
const entryResults = new Map<string, boolean>();

/** The result of a finished check, so callers can render it without waiting a frame */
export function getCachedWiktionaryEntry(word: string): boolean | undefined {
  return entryResults.get(word);
}

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

  const check = getUserAgent()
    .then((ua) => fetch(API_URL + encodeURIComponent(word), ua ? { headers: { 'User-Agent': ua } } : undefined))
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((json) => {
      const exists = !isMissingPage(json);
      entryResults.set(word, exists);
      return exists;
    })
    .catch((error) => {
      console.warn(`Wiktionary entry check failed for "${word}":`, error);
      entryChecks.delete(word);
      return null;
    });
  entryChecks.set(word, check);
  return check;
}
