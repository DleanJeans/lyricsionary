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
// Base forms to look up for an inflected word, e.g. both verbs a participle could come from
const MAX_LEMMAS = 2;
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
    .replace(/<!--[\s\S]*?-->/g, '')
    // Template styles, e.g. fragen's '.mw-parser-output .object-usage-tag{font-style:italic}'
    .replace(/<(\w+)\b[^>]*\btemplatestyles\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Sub-sense lists can be left unclosed, e.g. immer's 'always\n<ol><li>at all times without exception'
    .replace(/<(ul|ol|dl)\b[\s\S]*?(?:<\/\1>|$)/gi, '')
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
  if (!isFormOf(html)) return undefined;
  const span = html.match(/<span\b[^>]*class="[^"]*\bmention-gloss\b(?!-)[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  const gloss = span
    ? stripDefinitionHtml(span[1])
    : stripDefinitionHtml(html).match(/\bof\s+\S.*?\s[“"]([^“”"]+)[”"]\s*$/)?.[1];
  return gloss?.trim() || undefined;
}

function isFormOf(html: string): boolean {
  return /class="[^"]*\bform-of-definition\b/i.test(html);
}

const ANNOTATION_SPAN =
  /<span\b[^>]*class="(?:[^"]*\s)?(?:mention-gloss[\w-]*|gloss-[\w-]+|qualifier[\w-]*|ib-[\w-]+|ann-pos|usage-label-sense)(?:\s[^"]*)?"[^>]*>/i;

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
    // Usage notes too, e.g. fragen's "to ask [with accusative ‘someone’ and accusative ‘something’]"
    text = text.replace(/\s*\([^()]*\)|\s*\[[^[\]]*\]/g, '');
  } while (text !== previous);
  const isShort = (part: string) => part.split(/\s+/).length <= MAX_GLOSS_WORDS;
  // Semicolons separate synonyms; commas only do when every part is short ("always, ever"),
  // otherwise they're part of an explanation ("used to emphasize ..., which itself is stressed")
  return text.split(';').flatMap((segment) => {
    const parts = segment
      .split(',')
      .map((part) => part.trim().replace(/\.$/, ''))
      .filter(Boolean);
    return parts.every(isShort) ? parts : [];
  });
}

export interface WiktionaryEntry {
  /** Short translations, e.g. "always" */
  glosses: WiktionaryDefinition[];
  /** Full definitions, without form-of ones like "third-person singular present" */
  definitions: WiktionaryDefinition[];
  /** Base forms of an inflected word, e.g. "fragen" for "fragt" */
  lemmas: string[];
}

/** The base form a form-of definition links to, e.g. fragen in 'inflection of <a>fragen</a>:' */
export function getFormOfLemma(html: string): string | undefined {
  const link = html.match(/<span\b[^>]*class="form-of-definition-link"[^>]*>[\s\S]*?<a\b([^>]*)>([\s\S]*?)<\/a>/i);
  if (!link) return undefined;
  const title = link[1].match(/\btitle="([^"]+)"/)?.[1];
  return stripDefinitionHtml(title ?? link[2]) || undefined;
}

/** The parts of the REST API response for one language, e.g. "German" */
export function parseEntry(response: unknown, language: string): WiktionaryEntry {
  const entry: WiktionaryEntry = { glosses: [], definitions: [], lemmas: [] };
  if (!response || typeof response !== 'object') return entry;
  const target = language.toLowerCase();
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
        if (isFormOf(definition)) {
          const formOfGloss = getFormOfGloss(definition);
          const lemma = getFormOfLemma(definition);
          if (formOfGloss) add(entry.glosses, partOfSpeech, formOfGloss);
          // Without a gloss, "inflection of fragen" says nothing about the meaning by itself
          else if (lemma && !entry.lemmas.includes(lemma)) entry.lemmas.push(lemma);
          continue;
        }
        for (const gloss of getShortGlosses(definition)) add(entry.glosses, partOfSpeech, gloss);
        add(entry.definitions, partOfSpeech, stripDefinitionHtml(definition));
      }
    }
  }
  return entry;
}

/** Suggestions from one response: short translations when the entry has any, otherwise the full definitions */
export function parseDefinitions(response: unknown, language: string): WiktionaryDefinition[] {
  const { glosses, definitions } = parseEntry(response, language);
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
 * when the page has none ("liebe" vs "Liebe") the other casing is tried too. Inflected forms without a
 * meaning of their own ("fragt") use their base form's ("fragen"). Resolves null on failure.
 */
export async function getWiktionaryDefinitions(word: string, language: string): Promise<WiktionaryDefinition[] | null> {
  const lower = word.toLowerCase();
  const variants = [word, word === lower ? word.charAt(0).toUpperCase() + word.slice(1) : lower];
  try {
    for (const title of variants) {
      const entry = parseEntry(await fetchDefinitionResponse(title), language);
      if (entry.glosses.length > 0) return entry.glosses.slice(0, MAX_DEFINITIONS);

      for (const lemma of entry.lemmas.filter((l) => l !== title).slice(0, MAX_LEMMAS)) {
        const definitions = parseDefinitions(await fetchDefinitionResponse(lemma), language);
        if (definitions.length > 0) return definitions;
      }
      if (entry.definitions.length > 0) return entry.definitions.slice(0, MAX_DEFINITIONS);
    }
    return [];
  } catch (error) {
    console.warn(`Wiktionary definitions failed for "${word}":`, error);
    return null;
  }
}

const PARSE_API_URL =
  'https://en.wiktionary.org/w/api.php?action=parse&format=json&formatversion=2&redirects=1&prop=text&origin=*&page=';
const MAX_AUDIO = 6;
const MAX_IPA = 3;

export interface WiktionaryAudio {
  /** Commons file name, e.g. "De-Liebe.ogg" */
  title: string;
  url: string;
  /** Where the speaker is from, e.g. "Germany (Berlin)"; empty when the entry doesn't say */
  label: string;
}

/** The HTML of one language's section of a rendered page, e.g. everything under the "German" heading */
export function getLanguageSection(html: string, language: string): string | undefined {
  const id = language.trim().replace(/ /g, '_');
  // Each level-2 heading starts a language, e.g. '<div class="mw-heading mw-heading2 ..."><h2 id="German">'
  for (const section of html.split(/<div\b[^>]*class="[^"]*\bmw-heading2\b[^"]*"[^>]*>/i).slice(1)) {
    // The mobile skin puts an expand icon before the h2
    const heading = section.match(/<h2\b[^>]*\bid="([^"]+)"/i)?.[1];
    if (heading?.toLowerCase() === id.toLowerCase()) return section;
  }
  return undefined;
}

/** Absolute URL of an audio source's src attribute, which is protocol-relative and HTML-escaped */
function audioUrl(src: string): string {
  const url = src.replace(/&amp;/g, '&');
  return url.startsWith('//') ? `https:${url}` : url;
}

/**
 * Pronunciation recordings in the language's section of a rendered page (the parse API's HTML). Each
 * one prefers the MP3 transcode, which every platform can play, over the original Ogg or WAV.
 */
export function parseAudio(html: string, language: string): WiktionaryAudio[] {
  const section = getLanguageSection(html, language);
  if (!section) return [];
  const audio: WiktionaryAudio[] = [];
  // e.g. '<table class="audiotable"><tr><td>Audio (Germany (Berlin)):</td><td class="audiofile"><audio ...>'
  for (const [table] of section.matchAll(/<table\b[^>]*class="audiotable"[\s\S]*?<\/table>/gi)) {
    const element = table.match(/<audio\b([^>]*)>([\s\S]*?)<\/audio>/i);
    if (!element) continue;
    const title = stripDefinitionHtml(element[1].match(/\bdata-mwtitle="([^"]+)"/)?.[1] ?? '');
    const sources = [...element[2].matchAll(/<source\b([^>]*)>/gi)].map(([, attributes]) => ({
      src: attributes.match(/\bsrc="([^"]+)"/)?.[1],
      type: attributes.match(/\btype="([^"]+)"/)?.[1] ?? '',
    }));
    const source = sources.find((s) => s.src && s.type.startsWith('audio/mpeg')) ?? sources.find((s) => s.src);
    if (!source?.src || audio.some((a) => a.title === title)) continue;
    const label = stripDefinitionHtml(table.match(/<td\b[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? '')
      .replace(/^Audio\b\s*/i, '')
      .replace(/:$/, '')
      .replace(/^\((.*)\)$/, '$1')
      .trim();
    audio.push({ title, url: audioUrl(source.src), label });
  }
  return audio;
}

/**
 * Phonemic IPA transcriptions in the language's section of a rendered page, e.g. "/ˈliːbə/", without
 * rhymes ("-iːbə"), narrow transcriptions ("[ko.ɾaˈθõn]") or partial ones ("/-ˈmoɹ/")
 */
export function parseIpa(html: string, language: string): string[] {
  const section = getLanguageSection(html, language);
  if (!section) return [];
  const ipa: string[] = [];
  for (const [, span] of section.matchAll(/<span\b[^>]*class="IPA\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)) {
    const text = stripDefinitionHtml(span);
    if (/^\/[^-/][^/]*\/$/.test(text) && !ipa.includes(text)) ipa.push(text);
  }
  return ipa.slice(0, MAX_IPA);
}

export interface WiktionaryPronunciation {
  ipa: string[];
  audio: WiktionaryAudio[];
}

const pageRequests = new Map<string, Promise<string | null>>();

/** A page's rendered HTML, or null when there's no page with that title */
function fetchPageHtml(title: string): Promise<string | null> {
  const cached = pageRequests.get(title);
  if (cached) return cached;

  const request = getUserAgent()
    .then((ua) => fetch(PARSE_API_URL + encodeURIComponent(title), ua ? { headers: { 'User-Agent': ua } } : undefined))
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((json: { parse?: { text?: string }; error?: { code?: string; info?: string } }) => {
      if (json.error?.code === 'missingtitle') return null;
      if (typeof json.parse?.text !== 'string') throw new Error(json.error?.info ?? 'No page text');
      return json.parse.text;
    })
    .catch((error) => {
      pageRequests.delete(title);
      throw error;
    });
  pageRequests.set(title, request);
  return request;
}

/**
 * IPA and pronunciation recordings from the word's Wiktionary page in the given language, trying the
 * other casing too like getWiktionaryDefinitions. Resolves null on failure.
 */
export async function getWiktionaryPronunciation(word: string, language: string): Promise<WiktionaryPronunciation | null> {
  const lower = word.toLowerCase();
  const variants = [word, word === lower ? word.charAt(0).toUpperCase() + word.slice(1) : lower];
  try {
    for (const title of variants) {
      const html = await fetchPageHtml(title);
      if (!html) continue;
      const pronunciation = { ipa: parseIpa(html, language), audio: parseAudio(html, language).slice(0, MAX_AUDIO) };
      if (pronunciation.ipa.length > 0 || pronunciation.audio.length > 0) return pronunciation;
    }
    return { ipa: [], audio: [] };
  } catch (error) {
    console.warn(`Wiktionary pronunciation failed for "${word}":`, error);
    return null;
  }
}
