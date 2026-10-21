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

const DEFINITION_API_URL = 'https://en.wiktionary.org/api/rest_v1/page/definition/';
const MAX_DEFINITIONS = 8;
// Longer phrases read as explanations rather than translations to write next to the word
const MAX_GLOSS_WORDS = 4;

export interface WiktionaryDefinition {
  partOfSpeech: string;
  text: string;
}

interface DefinitionSection {
  partOfSpeech?: string;
  language?: string;
  definitions?: { definition?: string }[];
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Plain text of a definition's HTML, without nested sub-sense lists or example blocks */
export function stripDefinitionHtml(html: string): string {
  return html
    .replace(/<(ul|ol|dl)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (match, entity: string) => {
      if (entity[0] === '#') {
        const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return Number.isNaN(code) ? match : String.fromCodePoint(code);
      }
      return ENTITIES[entity.toLowerCase()] ?? match;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The English gloss of a form-of definition, e.g. "feelings" from 'nominative plural of Gefühl
 * “feelings”', which is what the word means in the lyrics. Undefined for ordinary definitions.
 */
export function getFormOfGloss(html: string): string | undefined {
  const span = html.match(/<span\b[^>]*class="[^"]*\bmention-gloss\b(?!-)[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  const gloss = span
    ? stripDefinitionHtml(span[1])
    : stripDefinitionHtml(html).match(/\bof\s+\S.*?\s[“"]([^“”"]+)[”"]\s*$/)?.[1];
  return gloss?.trim() || undefined;
}

const ANNOTATION_SPAN = /<span\b[^>]*class="[^"]*\b(?:gloss|qualifier|ib)-[^"]*"[^>]*>/i;

/**
 * Remove gloss and qualifier spans, e.g. the "(he who rents, lets)" of 'landlord (he who rents, lets)',
 * along with any links nested inside them
 */
function removeAnnotationSpans(html: string): string {
  let result = html;
  for (let match = ANNOTATION_SPAN.exec(result); match; match = ANNOTATION_SPAN.exec(result)) {
    const spanTags = /<(\/?)span\b[^>]*>/gi;
    spanTags.lastIndex = match.index + match[0].length;
    let depth = 1;
    let end = result.length;
    for (let tag = spanTags.exec(result); tag; tag = spanTags.exec(result)) {
      depth += tag[1] ? -1 : 1;
      if (depth === 0) {
        end = spanTags.lastIndex;
        break;
      }
    }
    result = result.slice(0, match.index) + result.slice(end);
  }
  return result;
}

/**
 * Short translations in a definition, e.g. "always" from 'always (at all times, without exception)'
 * or "very often", "all the time" and "constantly" from 'very often; all the time; constantly'.
 * Bracketed glosses, qualifiers and parentheticals are dropped, and long explanations are skipped.
 */
export function getShortGlosses(html: string): string[] {
  let text = stripDefinitionHtml(removeAnnotationSpans(html));
  let previous: string;
  do {
    previous = text;
    text = text.replace(/\s*\([^()]*\)/g, '');
  } while (text !== previous);
  const isShort = (part: string) => part.split(/\s+/).length <= MAX_GLOSS_WORDS;
  // Semicolons separate synonyms; commas only do when every part is short ("always, ever"),
  // otherwise they're part of an explanation ("used to emphasize ..., which itself is stressed")
  const glosses = text.split(';').flatMap((segment) => {
    const parts = segment
      .split(',')
      .map((part) => part.trim().replace(/\.$/, ''))
      .filter(Boolean);
    return parts.every(isShort) ? parts : [];
  });
  if (glosses.length > 0) return glosses;

  // A definition led by a linked translation followed by an unmarked explanation, e.g.
  // '<a>always</a> at all times without exception'
  const leadingLink = stripDefinitionHtml(html.match(/^\s*<a\b[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? '');
  return leadingLink && isShort(leadingLink) ? [leadingLink] : [];
}

/**
 * Suggestions from the REST API response for one language, e.g. "German": short translations when
 * the entry has any, otherwise the full definitions
 */
export function parseDefinitions(response: unknown, language: string): WiktionaryDefinition[] {
  if (!response || typeof response !== 'object') return [];
  const target = language.toLowerCase();
  const glosses: WiktionaryDefinition[] = [];
  const definitions: WiktionaryDefinition[] = [];
  const add = (list: WiktionaryDefinition[], partOfSpeech: string, text: string) => {
    if (text && !list.some((d) => d.text === text)) list.push({ partOfSpeech, text });
  };
  for (const sections of Object.values(response as Record<string, DefinitionSection[]>)) {
    if (!Array.isArray(sections)) continue;
    for (const section of sections) {
      if (section.language?.toLowerCase() !== target) continue;
      const partOfSpeech = section.partOfSpeech ?? '';
      for (const { definition } of section.definitions ?? []) {
        if (!definition) continue;
        const formOfGloss = getFormOfGloss(definition);
        if (formOfGloss) {
          add(glosses, partOfSpeech, formOfGloss);
          continue;
        }
        for (const gloss of getShortGlosses(definition)) add(glosses, partOfSpeech, gloss);
        add(definitions, partOfSpeech, stripDefinitionHtml(definition));
      }
    }
  }
  return (glosses.length > 0 ? glosses : definitions).slice(0, MAX_DEFINITIONS);
}

const definitionRequests = new Map<string, Promise<unknown>>();

function fetchDefinitionResponse(title: string): Promise<unknown> {
  const cached = definitionRequests.get(title);
  if (cached) return cached;

  const request = getUserAgent()
    .then((ua) => fetch(DEFINITION_API_URL + encodeURIComponent(title), ua ? { headers: { 'User-Agent': ua } } : undefined))
    .then((res) => {
      // 404 means there's no page for this title
      if (res.status === 404) return null;
      return res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`));
    })
    .catch((error) => {
      definitionRequests.delete(title);
      throw error;
    });
  definitionRequests.set(title, request);
  return request;
}

/**
 * Definitions from the word's Wiktionary page in the given language. Titles are case-sensitive, so
 * when the page has none ("liebe" vs "Liebe") the other casing is tried too. Resolves null on failure.
 */
export async function getWiktionaryDefinitions(word: string, language: string): Promise<WiktionaryDefinition[] | null> {
  const lower = word.toLowerCase();
  const variants = [word, word === lower ? word.charAt(0).toUpperCase() + word.slice(1) : lower];
  try {
    for (const title of variants) {
      const definitions = parseDefinitions(await fetchDefinitionResponse(title), language);
      if (definitions.length > 0) return definitions;
    }
    return [];
  } catch (error) {
    console.warn(`Wiktionary definitions failed for "${word}":`, error);
    return null;
  }
}
