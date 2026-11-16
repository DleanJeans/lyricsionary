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

// Languages Wiktionary files under another name
const WIKTIONARY_LANGUAGES: Record<string, string> = {
  serbian: 'Serbo-Croatian',
  croatian: 'Serbo-Croatian',
  bosnian: 'Serbo-Croatian',
  norwegian: 'Norwegian Bokmål',
};

/** The name of a language's section on Wiktionary, e.g. "Serbo-Croatian" for Croatian */
export function getWiktionaryLanguage(language: string): string {
  return WIKTIONARY_LANGUAGES[language.trim().toLowerCase()] ?? language;
}

const DEFINITION_API_URL = 'https://en.wiktionary.org/api/rest_v1/page/definition/';
const MAX_DEFINITIONS = 8;
// Base forms to look up for an inflected word, e.g. both verbs a participle could come from
const MAX_LEMMAS = 2;
// Forms of forms, e.g. the feminine vidée of the participle vidé of vider
const MAX_LEMMA_DEPTH = 2;
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
 * “feelings”' or "me" from 'accusative of ich: me', which is what the word means in the lyrics.
 * Undefined for ordinary definitions.
 */
export function getFormOfGloss(html: string): string | undefined {
  if (!isFormOf(html)) return undefined;
  const span = html.match(/<span\b[^>]*class="[^"]*\bmention-gloss\b(?!-)[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  const gloss = span
    ? stripDefinitionHtml(span[1])
    : (stripDefinitionHtml(html).match(/\bof\s+[^\s“”"][^“”"]*?\s[“"]([^“”"]+)[”"]\s*$/)?.[1] ?? getTextAfterFormOf(html));
  return gloss?.trim() || undefined;
}

/**
 * Plain text after the form-of span, e.g. "me" in 'accusative of ich: me' or "better" in
 * 'comparative degree of bon ("better")'; not a nested list of forms
 */
function getTextAfterFormOf(html: string): string | undefined {
  const start = html.search(/<span\b[^>]*class="[^"]*\bform-of-definition\b(?!-)/i);
  if (start < 0) return undefined;
  const after = html.slice(getSpanEnd(html, start));
  if (/<(?:ol|ul|li)\b/i.test(after)) return undefined;
  const text = stripDefinitionHtml(after).replace(/^[\s:;,.]+|[\s.]+$/g, '');
  return unquote(text.replace(/^\(([^()]*)\)$/, '$1').trim()) || undefined;
}

/** A gloss without the quotes around it, e.g. better from '"better"' or '“better”' */
function unquote(text: string): string {
  return text.replace(/^(["“‘'])([^"“”‘’']*)(["”’'])$/, '$2').trim();
}

/** Index just past the closing tag of the span that opens at start */
function getSpanEnd(html: string, start: number): number {
  const spanTags = /<(\/?)span\b[^>]*>/gi;
  spanTags.lastIndex = start;
  let depth = 0;
  for (let tag = spanTags.exec(html); tag; tag = spanTags.exec(html)) {
    depth += tag[1] ? -1 : 1;
    if (depth === 0) return spanTags.lastIndex;
  }
  return html.length;
}

function isFormOf(html: string): boolean {
  return /class="[^"]*\bform-of-definition\b/i.test(html);
}

// Words a form-of definition's name ends with, e.g. "zu-infinitive" or "past participle"
const FORM_OF_NAME =
  /(?:infinitive|participle|gerund|supine|inflection|form|plural|singular|tense|imperative|subjunctive|indicative|nominative|accusative|dative|genitive|comparative|superlative|diminutive|spelling)$/i;

/**
 * The base form of a definition that is only a form-of line written without Wiktionary's form-of
 * markup, e.g. umdrehen in "zu-infinitive of umdrehen" for umzudrehen. Not "a form of government".
 */
export function getPlainFormOfLemma(html: string): string | undefined {
  const match = stripDefinitionHtml(html).match(/^([\p{L}-]+(?:\s+[\p{L}-]+){0,4})\s+of\s+([\p{L}'’-]+)\.?$/u);
  if (!match || /^(?:a|an|the|any|some|one)\s/i.test(match[1]) || !FORM_OF_NAME.test(match[1])) return undefined;
  const title = html.match(/<a\b[^>]*\btitle="([^"]+)"[^>]*>[\s\S]*?<\/a>\s*(?:<\/[^>]+>\s*)*\.?\s*$/i)?.[1];
  return (title && stripDefinitionHtml(title)) || match[2];
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
    result = result.slice(0, match.index) + result.slice(getSpanEnd(result, match.index));
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
  return splitShortGlosses(text);
}

/** "always, ever; very often" -> ["always", "ever", "very often"]; parts of a long explanation are dropped */
function splitShortGlosses(text: string): string[] {
  const isShort = (part: string) => part.split(/\s+/).length <= MAX_GLOSS_WORDS;
  // Semicolons separate synonyms; commas and spaced slashes only do when every part is short
  // ("always, ever", "tax adviser / tax advisor"), otherwise they're part of an explanation
  // ("used to emphasize ..., which itself is stressed")
  return text.split(';').flatMap((segment) => {
    const parts = segment
      .split(/,|\s+\/\s+/)
      // Each meaning can be quoted on its own, e.g. '"good", "nice"'
      .map((part) => unquote(part.trim().replace(/\.$/, '')))
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
  /**
   * Base forms whose form-of definition has no gloss of its own, so their meanings are the meanings,
   * e.g. wissen and weißen for weiß, alongside its adjective "white"
   */
  lemmasWithoutGloss: string[];
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
  const entry: WiktionaryEntry = { glosses: [], definitions: [], lemmas: [], lemmasWithoutGloss: [] };
  if (!response || typeof response !== 'object') return entry;
  const target = getWiktionaryLanguage(language).toLowerCase();
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
          // A list of meanings becomes one suggestion each, e.g. lieber's "rather, better, by preference"
          if (formOfGloss) {
            const parts = splitShortGlosses(formOfGloss);
            for (const gloss of parts.length > 0 ? parts : [formOfGloss]) add(entry.glosses, partOfSpeech, gloss);
          }
          // Without a gloss, "inflection of fragen" says nothing about the meaning by itself, so its base
          // form's meanings are used; with one, the base form still says what word this is a form of
          if (lemma && !entry.lemmas.includes(lemma)) entry.lemmas.push(lemma);
          if (lemma && !formOfGloss && !entry.lemmasWithoutGloss.includes(lemma)) entry.lemmasWithoutGloss.push(lemma);
          continue;
        }
        // "zu-infinitive of umdrehen" says nothing about the meaning, so umdrehen's meanings are used
        const plainLemma = getPlainFormOfLemma(definition);
        if (plainLemma) {
          if (!entry.lemmas.includes(plainLemma)) entry.lemmas.push(plainLemma);
          if (!entry.lemmasWithoutGloss.includes(plainLemma)) entry.lemmasWithoutGloss.push(plainLemma);
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
 * Suggestions for one page title: its short translations plus its base forms' wherever a form-of
 * definition has no meaning of its own (following chains like vidée -> vidé -> vider, each a form of the
 * next), e.g. weiß's adjective "white" and the verbs wissen "to know" and weißen "to whiten". Without
 * any of those, its full definitions.
 */
async function getDefinitionsForTitle(title: string, language: string, depth: number): Promise<WiktionaryDefinition[]> {
  const entry = parseEntry(await fetchDefinitionResponse(title), language);
  const sources: WiktionaryDefinition[][] = [entry.glosses];
  if (depth < MAX_LEMMA_DEPTH) {
    for (const lemma of entry.lemmasWithoutGloss.filter((l) => l !== title).slice(0, MAX_LEMMAS)) {
      sources.push(await getDefinitionsForTitle(lemma, language, depth + 1));
    }
  }
  const suggestions = mergeSuggestions(sources.filter((list) => list.length > 0));
  return suggestions.length > 0 ? suggestions : entry.definitions.slice(0, MAX_DEFINITIONS);
}

/**
 * Up to MAX_DEFINITIONS suggestions, in order, with each list (an etymology's meanings or a base form's)
 * getting a fair share first so a long one can't push the others out; spare room goes to the longer ones
 */
function mergeSuggestions(lists: WiktionaryDefinition[][]): WiktionaryDefinition[] {
  if (lists.length === 0) return [];
  const share = Math.max(1, Math.floor(MAX_DEFINITIONS / lists.length));
  const taken = lists.map((list) => Math.min(list.length, share));
  let room = MAX_DEFINITIONS - taken.reduce((sum, n) => sum + n, 0);
  for (let i = 0; i < lists.length && room > 0; i++) {
    const extra = Math.min(lists[i].length - taken[i], room);
    taken[i] += extra;
    room -= extra;
  }
  const merged: WiktionaryDefinition[] = [];
  lists.forEach((list, i) => {
    for (const definition of list.slice(0, taken[i])) {
      if (!merged.some((d) => d.text === definition.text)) merged.push(definition);
    }
  });
  return merged.slice(0, MAX_DEFINITIONS);
}

/**
 * The words this one is a form of, following chains like vidée -> vidé -> vider, e.g. vouloir for veux.
 * Resolves [] when it isn't a form of anything or the page can't be read.
 */
export async function getWiktionaryLemmas(word: string, language: string): Promise<string[]> {
  const lemmas: string[] = [];
  const visit = async (title: string, depth: number) => {
    const entry = parseEntry(await fetchDefinitionResponse(title), language);
    for (const lemma of entry.lemmas.filter((l) => l !== title && l !== word).slice(0, MAX_LEMMAS)) {
      if (lemmas.includes(lemma)) continue;
      lemmas.push(lemma);
      if (depth < MAX_LEMMA_DEPTH) await visit(lemma, depth + 1);
    }
  };
  try {
    await visit(word, 1);
    if (lemmas.length === 0 && word !== word.toLowerCase()) await visit(word.toLowerCase(), 1);
    // e.g. warten for gewartet, which has no page of its own
    const participleLemma = lemmas.length === 0 ? await findGermanParticipleLemma(word, language) : undefined;
    if (participleLemma) lemmas.push(participleLemma);
  } catch {
    // No hint is better than a wrong one
  }
  return lemmas;
}

/**
 * A German word written with ss, or its ß spelling when it has one, e.g. heiß for heiss, so a Swiss
 * spelling without a page of its own can be looked up as the one that has. Empty for other words.
 */
export function germanEszettForms(word: string, language: string): string[] {
  if (getWiktionaryLanguage(language).trim().toLowerCase() !== 'german' || !/ss/i.test(word)) return [];
  const forms = [word.replace(/ss/g, 'ß').replace(/SS/g, 'ẞ')];
  const lower = word.toLowerCase().replace(/ss/g, 'ß');
  if (!forms.includes(lower)) forms.push(lower);
  return forms.filter((f) => f !== word);
}

const ALTERNATIVE_SPELLING_OF =
  /\b(?:spelling|orthography|writing|variant|romanization)\s+of\b|\b(?:alternative|alt\.?|obsolete|dated|archaic|nonstandard|non-standard|superseded|rare|uncommon|older|former)\s+form\s+of\b/i;

/**
 * The page a word's page says it is only another spelling of, e.g. heiß for heiss's "Alternative spelling
 * of heiß", or undefined when it isn't one
 */
export function getAlternativeSpellingTarget(section: string): string | undefined {
  const text = section.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  if (!ALTERNATIVE_SPELLING_OF.test(text)) return undefined;
  return getFormOfLemmas(section)[0];
}

/**
 * Definitions from the word's Wiktionary page in the given language. Titles are case-sensitive, so
 * when the page has none ("liebe" vs "Liebe") the other casing is tried too. Inflected forms without a
 * meaning of their own ("fragt") use their base form's ("fragen"). Resolves null on failure.
 */
const definitionResults = new Map<string, WiktionaryDefinition[]>();
const definitionKey = (word: string, language: string) => `${getWiktionaryLanguage(language).toLowerCase()}\u0000${word}`;

/** Definitions already known for a word, e.g. read from Wiktionary in an earlier session, so they aren't asked for again */
export function seedWiktionaryDefinitions(word: string, language: string, definitions: WiktionaryDefinition[]): void {
  if (definitions.length > 0) definitionResults.set(definitionKey(word, language), definitions);
}

export async function getWiktionaryDefinitions(word: string, language: string): Promise<WiktionaryDefinition[] | null> {
  const known = definitionResults.get(definitionKey(word, language));
  if (known) return known;
  const definitions = await fetchWiktionaryDefinitions(word, language);
  // Failures (null) are asked again next time
  if (definitions && definitions.length > 0) definitionResults.set(definitionKey(word, language), definitions);
  return definitions;
}

async function fetchWiktionaryDefinitions(word: string, language: string): Promise<WiktionaryDefinition[] | null> {
  const lower = word.toLowerCase();
  const variants = [word, word === lower ? word.charAt(0).toUpperCase() + word.slice(1) : lower];
  try {
    for (const title of variants) {
      const definitions = await getDefinitionsForTitle(title, language, 0);
      if (definitions.length > 0) return definitions;
    }
    // A German ge- past participle without a page of its own means what its verb does, e.g. gewartet
    const lemma = await findGermanParticipleLemma(word, language);
    if (lemma) return getDefinitionsForTitle(lemma, language, 1);
    // A Swiss or reformed spelling without a page, e.g. heiss for heiß
    for (const title of germanEszettForms(word, language)) {
      const definitions = await getDefinitionsForTitle(title, language, 1);
      if (definitions.length > 0) return definitions;
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
  const id = getWiktionaryLanguage(language).trim().replace(/ /g, '_');
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
 * rhymes ("-iːbə") or partial ones ("/-ˈmoɹ/"). Narrow transcriptions ("[ko.ɾaˈθõn]") are used only
 * when there's no phonemic one, e.g. "[ˈʃtɔɪ̯ɐbəˌʁaːtɐ]" for Steuerberater.
 */
export function parseIpa(html: string, language: string, { affix = false } = {}): string[] {
  const section = getLanguageSection(html, language);
  if (!section) return [];
  const phonemic: string[] = [];
  const narrow: string[] = [];
  // An affix's own page writes its IPA with the hyphen, e.g. "/-ɪçkaɪ̯t/" on -igkeit
  const start = affix ? '' : '-';
  const phonemicPattern = new RegExp(`^/[^${start}/][^/]*/$`);
  const narrowPattern = new RegExp(`^\\[[^${start}\\]][^\\]]*\\]$`);
  for (const [, span] of section.matchAll(/<span\b[^>]*class="IPA\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)) {
    const text = stripDefinitionHtml(span);
    if (phonemicPattern.test(text) && !phonemic.includes(text)) phonemic.push(text);
    else if (narrowPattern.test(text) && !narrow.includes(text)) narrow.push(text);
  }
  return (phonemic.length > 0 ? phonemic : narrow).slice(0, MAX_IPA);
}

export interface WiktionaryPronunciation {
  ipa: string[];
  audio: WiktionaryAudio[];
  /**
   * The words the IPA was put together from when the entry has none of its own, e.g. ["leicht", "-igkeit"]
   * for Leichtigkeit, so it can be shown as a guess
   */
  derivedFrom?: string[];
}

const MAX_PARTS = 4;
// How many pages down a part's IPA is looked for, e.g. scheißkalt -> scheiß- -> Scheiß
const MAX_PART_DEPTH = 3;

/**
 * The pages a word is made of, from its etymology in the language's section, e.g. ["leicht", "-igkeit"] for
 * Leichtigkeit's "leicht +‎ -igkeit" or ["Steuer", "Berater"] for Steuerberater. Only a run of links to the
 * same language joined by "+" counts, so "From Middle High German līhtecheit" gives none.
 */
export function parseEtymologyParts(html: string, language: string): string[] {
  const section = getLanguageSection(html, language);
  if (!section) return [];
  const anchor = getWiktionaryLanguage(language).trim().replace(/ /g, '_').toLowerCase();
  // Every Etymology (or "Etymology 1") heading up to the next heading
  const etymologies = section.split(/<div\b[^>]*class="[^"]*\bmw-heading\b[^"]*"[^>]*>/i)
    .filter((part) => /^\s*<h[3-6]\b[^>]*\bid="Etymology(?:_\d+)?"/i.test(part));
  for (const etymology of etymologies) {
    for (const [, paragraph] of etymology.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
      // e.g. '<i class="Latn mention" lang="de"><a href="/wiki/leicht#German" title="leicht">leicht</a></i>'
      const mentions = [...paragraph.matchAll(/<i\b[^>]*class="[^"]*\bmention\b[^"]*"[^>]*>([\s\S]*?)<\/i>/gi)];
      let run: string[] = [];
      let end = -1;
      for (const mention of mentions) {
        const href = mention[1].match(/<a\b[^>]*\bhref="\/wiki\/([^"#]+)#([^"]+)"/i);
        const title = href && decodeURIComponent(href[1]).replace(/_/g, ' ');
        const sameLanguage = !!href && href[2].toLowerCase() === anchor;
        // Only glosses, like '(“tax”)', and the "+" between this mention and the one before
        const between = stripDefinitionHtml(paragraph.slice(end, mention.index))
          .replace(/\([^)]*\)/g, '')
          .replace(/[\s\u200e\u200f]/g, '');
        const joined = end >= 0 && between === '+';
        if (run.length > 1 && !joined) break;
        run = title && sameLanguage ? (joined ? [...run, title] : [title]) : [];
        end = mention.index + mention[0].length;
      }
      if (run.length > 1 && run.length <= MAX_PARTS) return run;
    }
  }
  return [];
}

// Languages whose Wiktionary IPA doesn't mark stress, so none is added to a one-syllable first part
const UNMARKED_STRESS = new Set(['french', 'japanese', 'korean', 'chinese', 'mandarin', 'cantonese', 'vietnamese', 'thai', 'indonesian', 'malay']);

/**
 * One IPA from its parts', e.g. /laɪ̯çt/ + /-ɪçkaɪ̯t/ -> /ˈlaɪ̯çtɪçkaɪ̯t/ or /ˈʃtɔɪ̯ɐ/ + /bəˈʁaːtɐ/ ->
 * /ˈʃtɔɪ̯ɐbəˌʁaːtɐ/. The first stressed word keeps the main stress and later ones get a secondary
 * stress, as in compounds, unless a stressed suffix takes it, e.g. -ei in Bäckerei.
 */
export function joinIpa(parts: { title: string; ipa: string }[], language: string): string {
  const cleaned = parts.map(({ title, ipa }) => ({
    suffix: title.startsWith('-'),
    affix: title.startsWith('-') || title.endsWith('-'),
    ipa: ipa.trim().replace(/^[/[]|[/\]]$/g, '').replace(/^[-‿]+|[-‿]+$/g, '').trim(),
  }));
  const narrow = parts.some(({ ipa }) => ipa.trim().startsWith('['));
  const stressedSuffix = cleaned.some((part) => part.suffix && part.ipa.includes('ˈ'));
  const marksStress = !UNMARKED_STRESS.has(getWiktionaryLanguage(language).trim().toLowerCase());
  let stressed = false;
  const joined = cleaned.map((part) => {
    let ipa = part.ipa;
    if (stressedSuffix && !part.suffix) ipa = ipa.replace(/ˈ/g, '');
    else if (stressed) {
      ipa = ipa.replace(/ˈ/g, 'ˌ');
      // A later one-syllable word gets a secondary stress too, e.g. kalt in /ˈʃaɪ̯sˌkalt/
      if (!/[ˌ]/.test(ipa) && !part.affix && marksStress) ipa = `ˌ${ipa}`;
    }
    else if (!ipa.includes('ˈ') && !part.affix && marksStress && !stressedSuffix) ipa = `ˈ${ipa.replace(/^ˌ/, '')}`;
    if (ipa.includes('ˈ')) stressed = true;
    return ipa;
  }).join('');
  return narrow ? `[${joined}]` : `/${joined}/`;
}

/**
 * The one word in the language an etymology names, e.g. Scheiß in scheiß-'s "From Scheiß", for a page
 * that isn't made of parts
 */
export function parseEtymologySource(html: string, language: string): string | undefined {
  const section = getLanguageSection(html, language);
  if (!section) return undefined;
  const anchor = getWiktionaryLanguage(language).trim().replace(/ /g, '_').toLowerCase();
  const etymology = section.split(/<div\b[^>]*class="[^"]*\bmw-heading\b[^"]*"[^>]*>/i)
    .find((part) => /^\s*<h[3-6]\b[^>]*\bid="Etymology(?:_\d+)?"/i.test(part));
  const paragraph = etymology?.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  if (!paragraph) return undefined;
  for (const [, mention] of paragraph.matchAll(/<i\b[^>]*class="[^"]*\bmention\b[^"]*"[^>]*>([\s\S]*?)<\/i>/gi)) {
    const href = mention.match(/<a\b[^>]*\bhref="\/wiki\/([^"#]+)#([^"]+)"/i);
    if (href && href[2].toLowerCase() === anchor) return decodeURIComponent(href[1]).replace(/_/g, ' ');
  }
  return undefined;
}

/**
 * An affix's IPA from the word it comes from, e.g. scheiß- from Scheiß, or from Scheiße without its -e.
 * Undefined when the word is spelled otherwise.
 */
export function affixIpaFromWord(affix: string, word: string, wordIpa: string): string | undefined {
  const bare = affix.replace(/^-|-$/g, '').toLowerCase();
  const lowerWord = word.toLowerCase();
  if (lowerWord === bare) return wordIpa;
  if (lowerWord === `${bare}e` && /ə[/\]]$/.test(wordIpa.trim())) return wordIpa.trim().replace(/ə([/\]])$/, '$1');
  return undefined;
}

/**
 * A part's first IPA, from its page or, failing that, from its own parts (-igkeit's -ig + -keit) or the
 * word it comes from (scheiß-'s Scheiß), going down up to depth more pages. The title is the part's
 * without the hyphen when its IPA is a whole word's, so it's stressed like one.
 */
async function getPartIpa(title: string, language: string, depth: number): Promise<{ title: string; ipa: string } | undefined> {
  const html = await fetchPageHtml(title);
  if (!html) return undefined;
  const affix = title.startsWith('-') || title.endsWith('-');
  const ipa = parseIpa(html, language, { affix })[0];
  if (ipa) return { title, ipa };
  if (depth <= 0) return undefined;
  const derived = await getDerivedIpa(html, language, depth - 1);
  if (derived) return { title, ipa: derived.ipa };
  const source = affix ? parseEtymologySource(html, language) : undefined;
  if (!source || source === title) return undefined;
  const sourceIpa = await getPartIpa(source, language, depth - 1);
  const fromWord = sourceIpa && affixIpaFromWord(title, sourceIpa.title, sourceIpa.ipa);
  return fromWord ? { title: title.replace(/^-|-$/g, ''), ipa: fromWord } : undefined;
}

/** The IPA put together from the word's etymology parts, when every part has one */
async function getDerivedIpa(html: string, language: string, depth: number): Promise<{ ipa: string; parts: string[] } | undefined> {
  const parts = parseEtymologyParts(html, language);
  if (parts.length < 2) return undefined;
  const ipas = await Promise.all(parts.map((title) => getPartIpa(title, language, depth)));
  if (ipas.some((ipa) => !ipa)) return undefined;
  return { ipa: joinIpa(ipas.map((part) => part!), language), parts };
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

// Endings an inflection adds without changing how the word sounds, by language. French plurals of
// nouns often have no IPA on Wiktionary (rires, pleurs, regards, choux, nuits) though they sound like
// the singular; verb forms like parlent (parle) and adjective forms usually have their own.
const SILENT_ENDINGS: Record<string, [ending: string, replacement: string][]> = {
  french: [
    ['ent', 'e'],
    ['s', ''],
    ['x', ''],
  ],
};

/** Forms an inflected word sounds the same as, without its silent ending, e.g. "rire" for "rires" */
export function soundAlikeForms(word: string, language: string): string[] {
  const endings = SILENT_ENDINGS[getWiktionaryLanguage(language).trim().toLowerCase()] ?? [];
  return endings
    .filter(([ending]) => word.length > ending.length + 1 && word.endsWith(ending))
    .map(([ending, replacement]) => word.slice(0, -ending.length) + replacement);
}

/** Every base form the form-of definitions in a language section link to, e.g. fangen for fang */
function getFormOfLemmas(section: string): string[] {
  const lemmas: string[] = [];
  for (const [link] of section.matchAll(/<span\b[^>]*class="form-of-definition-link"[^>]*>[\s\S]*?<\/a>/gi)) {
    const lemma = getFormOfLemma(link);
    if (lemma && !lemmas.includes(lemma)) lemmas.push(lemma);
  }
  return lemmas;
}

// Sounds that lose their voice at the end of a German word, e.g. the g of sagen in sag /zaːk/
const DEVOICED: Record<string, string> = { b: 'p', d: 't', ɡ: 'k', g: 'k', v: 'f', z: 's', ʒ: 'ʃ' };
const IPA_VOWEL = /[aeiouyøœɛɔəɐɪʊʏæɑɒʌɜɘɵɤɯ](?!\u032f)|\u0329/g;

/**
 * The IPA of a German verb form that is its infinitive without the ending, from the infinitive's IPA, e.g.
 * fang (singular imperative of fangen) /ˈfaŋən/ -> /faŋ/, sage from sagen /ˈzaːɡn̩/ -> /ˈzaːɡə/ or
 * wander from wandern /ˈvandɐn/ -> /ˈvandɐ/. Undefined for any other form, e.g. fängt or fing.
 */
export function stemIpa(word: string, lemma: string, lemmaIpa: string): string | undefined {
  const lowerWord = word.toLowerCase();
  const lowerLemma = lemma.toLowerCase();
  if (!lowerLemma.startsWith(lowerWord)) return undefined;
  const removed = lowerLemma.slice(lowerWord.length);
  const open = lemmaIpa.trim()[0];
  if (open !== '/' && open !== '[') return undefined;
  const close = open === '/' ? '/' : ']';
  let ipa = lemmaIpa.trim().slice(1, -1).trim();
  if (removed === 'en') {
    // -en is said ən, ɛn or as a syllabic n̩, ŋ̩ or m̩, as in fangen /ˈfaŋən/, [ˈfaŋŋ̩] or leben [ˈleːbm̩]
    const stripped = ipa.replace(/(?:ə|ɛ)n$|[nŋm]\u0329$/, '');
    if (stripped === ipa || !stripped) return undefined;
    ipa = stripped.replace(/[bdɡgvzʒ]$/, (c) => DEVOICED[c]);
  } else if (removed === 'n' && lowerLemma.endsWith('en')) {
    // e.g. sage from sagen
    const stripped = ipa.replace(/(?:ə|ɛ)n$|[nŋm]\u0329$/, 'ə');
    if (stripped === ipa) return undefined;
    ipa = stripped;
  } else if (removed === 'n') {
    // e.g. wander from wandern, sammel from sammeln
    if (!ipa.endsWith('n')) return undefined;
    ipa = ipa.slice(0, -1);
  } else {
    return undefined;
  }
  // One syllable left needs no stress mark, e.g. /faŋ/
  if ((ipa.match(IPA_VOWEL) ?? []).length <= 1) ipa = ipa.replace(/[ˈˌ]/g, '');
  return `${open}${ipa}${close}`;
}

/**
 * The IPA of a German word whose last -e or -en is dropped (kauf' for kaufe or kaufen), from the full
 * form's IPA, e.g. kaufe /ˈkaʊ̯fə/ or kaufen /ˈkaʊ̯fn̩/ -> /ˈkaʊ̯f/. Undefined when no such ending is found.
 */
export function elidedIpa(ipaText: string): string | undefined {
  const open = ipaText.trim()[0];
  if (open !== '/' && open !== '[') return undefined;
  const close = open === '/' ? '/' : ']';
  let ipa = ipaText.trim().slice(1, -1).trim();
  const stripped = ipa.replace(/(?:ə|ɛ)n$|[nŋm]\u0329$|ə$/, '');
  if (stripped === ipa || !stripped) return undefined;
  ipa = stripped.replace(/[bdɡgvzʒ]$/, (c) => DEVOICED[c]);
  if ((ipa.match(IPA_VOWEL) ?? []).length <= 1) ipa = ipa.replace(/[ˈˌ]/g, '');
  return `${open}${ipa}${close}`;
}

/**
 * The IPA of a German word clipped as erklär'n or geh'n, from its full form's IPA with the schwa the
 * apostrophe stands for dropped, e.g. erklären /ɛɐ̯ˈklɛːrən/ -> /ɛɐ̯ˈklɛːrn/, gehen /ˈɡeːən/ -> /ˈɡeːn/.
 * Other clipped words (kauf') drop their whole ending, see elidedIpa. Undefined when no schwa is found.
 */
export function clippedFormIpa(word: string, fullIpa: string): string | undefined {
  if (!/\p{L}['\u2018\u2019\u2032\u02BC`\u00B4][nm]$/u.test(word)) return elidedIpa(fullIpa);
  const open = fullIpa.trim()[0];
  if (open !== '/' && open !== '[') return undefined;
  const body = fullIpa.trim().slice(1, -1).trim();
  const dropped = body.replace(/ə([nm])$/, '$1');
  if (dropped === body) return undefined;
  return `${open}${dropped}${open === '/' ? '/' : ']'}`;
}

// How an ending added to a German word sounds, e.g. the -e of Signale
const ADDED_ENDINGS: Record<string, string> = { e: 'ə', en: 'ən', n: 'n', er: 'ɐ', ern: 'ɐn', es: 'əs', em: 'əm', s: 's', se: 'sə' };
// Sounds a spelling keeps voiceless only at the end of a word, voiced again before an ending's vowel,
// e.g. Tag /taːk/ -> Tage /ˈtaːɡə/
const REVOICED: Record<string, [letters: RegExp, voiced: string]> = {
  p: [/b$/, 'b'],
  t: [/d$/, 'd'],
  k: [/g$/, 'ɡ'],
  f: [/[vw]$/, 'v'],
  s: [/[^s]s$/, 'z'],
  ç: [/ig$/, 'ɡ'],
};

/**
 * The IPA of a German form that is its base word plus an ending, from the base word's IPA, e.g. Signale
 * (plural of Signal) /zɪˈɡnaːl/ -> /zɪˈɡnaːlə/, Tage from Tag /taːk/ -> /ˈtaːɡə/ or schönen from schön.
 * Undefined for any other form, e.g. Häuser.
 */
export function endingIpa(word: string, lemma: string, lemmaIpa: string): string | undefined {
  const lowerWord = word.toLowerCase();
  const lowerLemma = lemma.toLowerCase();
  if (!lowerWord.startsWith(lowerLemma) || lowerWord === lowerLemma) return undefined;
  let added = lowerWord.slice(lowerLemma.length);
  // A doubled last letter says nothing new, e.g. Freundinnen's n or Busse's s
  const doubled = added.length > 1 && added[0] === lowerLemma.slice(-1) && !!ADDED_ENDINGS[added.slice(1)];
  if (doubled) added = added.slice(1);
  const ending = ADDED_ENDINGS[added];
  if (!ending) return undefined;
  const open = lemmaIpa.trim()[0];
  if (open !== '/' && open !== '[') return undefined;
  const close = open === '/' ? '/' : ']';
  let ipa = lemmaIpa.trim().slice(1, -1).trim();
  if (!ipa) return undefined;
  if (!doubled && /^[aeiouäöü]/.test(added)) {
    const revoiced = REVOICED[ipa.slice(-1)];
    if (revoiced && revoiced[0].test(lowerLemma)) ipa = ipa.slice(0, -1) + revoiced[1];
  }
  ipa += ending;
  // A word that grew a syllable needs a stress mark, e.g. /taːk/ -> /ˈtaːɡə/
  if (!/[ˈˌ]/.test(ipa) && (ipa.match(IPA_VOWEL) ?? []).length > 1) ipa = `ˈ${ipa}`;
  return `${open}${ipa}${close}`;
}

// Separable particles of German verbs, longest first so zurück wins over zu, with how they sound when
// the verb's page has no IPA to take them from, e.g. the auf of aufgehört
const GERMAN_PARTICLES: [particle: string, ipa: string][] = (
  [
    ['ab', 'ap'], ['an', 'an'], ['auf', 'aʊ̯f'], ['aus', 'aʊ̯s'], ['bei', 'baɪ̯'], ['da', 'daː'], ['dar', 'daːɐ̯'],
    ['durch', 'dʊʁç'], ['ein', 'aɪ̯n'], ['entgegen', 'ɛntˈɡeːɡn̩'], ['fest', 'fɛst'], ['fort', 'fɔʁt'], ['frei', 'fʁaɪ̯'],
    ['heim', 'haɪ̯m'], ['her', 'heːɐ̯'], ['heran', 'hɛˈʁan'], ['herauf', 'hɛˈʁaʊ̯f'], ['heraus', 'hɛˈʁaʊ̯s'],
    ['herein', 'hɛˈʁaɪ̯n'], ['herum', 'hɛˈʁʊm'], ['herunter', 'hɛˈʁʊntɐ'], ['hin', 'hɪn'], ['hinauf', 'hɪˈnaʊ̯f'],
    ['hinaus', 'hɪˈnaʊ̯s'], ['hinein', 'hɪˈnaɪ̯n'], ['hinunter', 'hɪˈnʊntɐ'], ['hoch', 'hoːx'], ['kennen', 'ˈkɛnən'],
    ['los', 'loːs'], ['mit', 'mɪt'], ['nach', 'naːx'], ['um', 'ʊm'], ['vor', 'foːɐ̯'], ['voran', 'foˈʁan'],
    ['voraus', 'foˈʁaʊ̯s'], ['vorbei', 'foːɐ̯ˈbaɪ̯'], ['weg', 'vɛk'], ['weiter', 'ˈvaɪ̯tɐ'], ['wieder', 'ˈviːdɐ'],
    ['zu', 't͡suː'], ['zurück', 't͡suˈʁʏk'], ['zusammen', 't͡suˈzamən'], ['über', 'ˈyːbɐ'], ['unter', 'ˈʊntɐ'],
  ] as [string, string][]
).sort((a, b) => b[0].length - a[0].length);

/** A German past participle's separable particle and the rest, e.g. auf + gehört for aufgehört */
function splitGermanParticle(word: string): { particle: string; ipa: string; core: string } | undefined {
  const lower = word.toLowerCase();
  for (const [particle, ipa] of GERMAN_PARTICLES) {
    if (lower.startsWith(`${particle}ge`) && lower.length > particle.length + 4) {
      return { particle, ipa, core: lower.slice(particle.length) };
    }
  }
  return undefined;
}

/**
 * The verbs a German ge- past participle may be of by its spelling, most likely first, e.g. warten for
 * gewartet, wandern for gewandert, fahren for gefahren or aufhören for aufgehört. Empty for a word that
 * doesn't look like one.
 */
export function germanParticipleLemmas(word: string): string[] {
  const lower = word.toLowerCase();
  const split = splitGermanParticle(lower);
  const particle = split?.particle ?? '';
  const core = split?.core ?? lower;
  if (!core.startsWith('ge') || core.length < 5) return [];
  const body = core.slice(2);
  const lemmas: string[] = [];
  // e.g. gewartet (warten), gesagt (sagen), gewandert (wandern), gefahren (fahren)
  if (body.endsWith('et')) lemmas.push(`${body.slice(0, -2)}en`);
  if (body.endsWith('t')) lemmas.push(`${body.slice(0, -1)}en`, `${body.slice(0, -1)}n`);
  if (body.endsWith('en')) lemmas.push(body);
  return [...new Set(lemmas)].filter((l) => l.length >= 4).map((l) => particle + l);
}

/** The IPA without its slashes or brackets, e.g. ˈvaʁtn̩ for /ˈvaʁtn̩/ */
function unwrapIpa(ipaText: string): { open: string; close: string; ipa: string } | undefined {
  const text = ipaText.trim();
  const open = text[0];
  if (open !== '/' && open !== '[') return undefined;
  const close = open === '/' ? '/' : ']';
  if (!text.endsWith(close)) return undefined;
  const ipa = text.slice(1, -1).trim();
  return ipa ? { open, close, ipa } : undefined;
}

/** The IPA of a lemma split after the sounds of its particle, e.g. /ˈaʊ̯fˌhøːʁən/ -> ˈaʊ̯f + ˌhøːʁən */
function splitIpaAfter(ipa: string, particleIpa: string): [head: string, rest: string] | undefined {
  const bare = (s: string) => s.replace(/[ˈˌ.͜͡]/g, '');
  const target = bare(particleIpa);
  for (let i = 1; i < ipa.length; i++) {
    if (bare(ipa.slice(0, i)) !== target) continue;
    // Not in the middle of a sound, e.g. before the ̯ of aʊ̯
    if (/[̀-ͯːˑ]/.test(ipa[i])) continue;
    return [ipa.slice(0, i), ipa.slice(i)];
  }
  return undefined;
}

/** A ge- participle's IPA from its verb's, without any particle, e.g. warten /ˈvaʁtn̩/ -> gewartet /ɡəˈvaʁtət/ */
function geParticipleIpa(core: string, lemma: string, lemmaIpa: string): string | undefined {
  const body = core.slice(2);
  let ipa = lemmaIpa;
  if (body === lemma) {
    // A strong verb keeping its vowel, e.g. gefahren from fahren
  } else if (lemma.endsWith('en') && (body === `${lemma.slice(0, -2)}et` || body === `${lemma.slice(0, -2)}t`)) {
    // -en is said ən, ɛn or as a syllabic n̩, ŋ̩ or m̩
    const stem = ipa.replace(/(?:ə|ɛ)n$|[nŋm]̩$/, '');
    if (stem === ipa || !stem) return undefined;
    ipa = body.endsWith('et') && body === `${lemma.slice(0, -2)}et` ? `${stem}ət` : `${devoiceEnd(stem)}t`;
  } else if (lemma.endsWith('n') && body === `${lemma.slice(0, -1)}t`) {
    // e.g. gewandert from wandern /ˈvandɐn/, gesammelt from sammeln
    if (!ipa.endsWith('n')) return undefined;
    ipa = `${ipa.slice(0, -1)}t`;
  } else {
    return undefined;
  }
  // ge- is never stressed, so the verb keeps its stress, and a verb starting with a vowel is said with a
  // glottal stop after it, e.g. gearbeitet /ɡəˈʔaʁbaɪ̯tət/
  let stressMark = '';
  if (/^[ˈˌ]/.test(ipa)) {
    stressMark = 'ˈ';
    ipa = ipa.slice(1);
  } else if (!ipa.includes('ˈ')) stressMark = 'ˈ';
  if (/^[aeiouyøœɛɔəɐɪʊʏæɑ]/.test(ipa)) ipa = `ʔ${ipa}`;
  return `ɡə${stressMark}${ipa}`;
}

/**
 * A stem's last sound as said at the end of a syllable, e.g. leb- /leːb/ -> /leːp/ or hör- /høːr/ ->
 * /høːɐ̯/ as in gehört (Wiktionary writes German r as r or ʁ)
 */
function devoiceEnd(stem: string): string {
  return stem.replace(/[bdɡgvzʒ]$/, (c) => DEVOICED[c]).replace(/ː[rʁ]$/, 'ːɐ̯');
}

/**
 * The IPA of a German ge- past participle from its verb's IPA, e.g. gewartet from warten /ˈvaʁtn̩/ ->
 * /ɡəˈvaʁtət/, gefahren from fahren -> /ɡəˈfaːʁən/ or aufgehört from aufhören /ˈaʊ̯fˌhøːʁən/ ->
 * /ˈaʊ̯fɡəˌhøːɐ̯t/. Undefined for any other form or one whose vowel changes, e.g. gesungen.
 */
export function participleIpa(word: string, lemma: string, lemmaIpa: string): string | undefined {
  const lower = word.toLowerCase();
  const lowerLemma = lemma.toLowerCase();
  const wrapped = unwrapIpa(lemmaIpa);
  if (!wrapped) return undefined;
  const { open, close } = wrapped;
  const split = splitGermanParticle(lower);
  if (split && lowerLemma.startsWith(split.particle) && lowerLemma !== split.core.slice(2)) {
    const parts = splitIpaAfter(wrapped.ipa, split.ipa);
    if (!parts) return undefined;
    const core = geParticipleIpa(split.core, lowerLemma.slice(split.particle.length), parts[1].replace(/^ˌ/, 'ˈ'));
    if (!core) return undefined;
    return joinIpa([
      { title: split.particle, ipa: `${open}${parts[0]}${close}` },
      { title: split.core, ipa: `${open}${core}${close}` },
    ], 'German');
  }
  if (!lower.startsWith('ge')) return undefined;
  const ipa = geParticipleIpa(lower, lowerLemma, wrapped.ipa);
  return ipa ? `${open}${ipa}${close}` : undefined;
}

/**
 * The verb a German ge- past participle without a page of its own is of, e.g. warten for gewartet, found
 * by its spelling and kept only when the verb's conjugation table lists the participle
 */
async function findGermanParticipleLemma(word: string, language: string): Promise<string | undefined> {
  if (getWiktionaryLanguage(language).trim().toLowerCase() !== 'german') return undefined;
  const lower = word.toLowerCase();
  for (const lemma of germanParticipleLemmas(lower)) {
    const html = await fetchPageHtml(lemma);
    const section = html && getLanguageSection(html, language);
    if (section && section.toLowerCase().includes(`>${lower}<`)) return lemma;
  }
  return undefined;
}

/**
 * A German ge- past participle's IPA when its page has none, put together from its verb's, e.g. gewartet
 * from warten, or for a separable verb whose vowel changes, from its core's, e.g. auf + gehört for
 * aufgehört or mit + genommen for mitgenommen. The verb is the one its page is a form of, or else the one
 * whose conjugation lists it.
 */
async function getParticipleIpa(word: string, section: string | undefined, language: string): Promise<{ ipa: string; lemma: string } | undefined> {
  if (getWiktionaryLanguage(language).trim().toLowerCase() !== 'german') return undefined;
  const lower = word.toLowerCase();
  const split = splitGermanParticle(lower);
  if (!lower.startsWith('ge') && !split) return undefined;
  const lemma = (section ? getFormOfLemmas(section)[0] : undefined) ?? (await findGermanParticipleLemma(lower, language));
  if (!lemma) return undefined;
  const html = await fetchPageHtml(lemma);
  const lemmaIpa = html ? parseIpa(html, language)[0] : undefined;
  const ipa = lemmaIpa && participleIpa(lower, lemma, lemmaIpa);
  if (ipa) return { ipa, lemma };
  if (!split || !lemma.toLowerCase().startsWith(split.particle)) return undefined;
  const core = (await getWiktionaryPronunciation(split.core, language))?.ipa[0];
  if (!core) return undefined;
  return { ipa: joinIpa([{ title: split.particle, ipa: `/${split.ipa}/` }, { title: split.core, ipa: core }], language), lemma };
}

/**
 * A German form's IPA from its base word's, e.g. fang's from fangen's or Signale's from Signal's, with
 * the base word it came from
 */
async function getStemIpa(word: string, section: string, language: string): Promise<{ ipa: string; lemma: string } | undefined> {
  if (getWiktionaryLanguage(language).trim().toLowerCase() !== 'german') return undefined;
  for (const lemma of getFormOfLemmas(section)) {
    const lower = word.toLowerCase();
    const lowerLemma = lemma.toLowerCase();
    if (!lowerLemma.startsWith(lower) && !lower.startsWith(lowerLemma)) continue;
    const html = await fetchPageHtml(lemma);
    const lemmaIpa = html ? parseIpa(html, language)[0] : undefined;
    const ipa = lemmaIpa && (stemIpa(word, lemma, lemmaIpa) ?? endingIpa(word, lemma, lemmaIpa));
    if (ipa) return { ipa, lemma };
  }
  return undefined;
}

/**
 * IPA and pronunciation recordings from the word's Wiktionary page in the given language, trying the
 * other casing too like getWiktionaryDefinitions. An inflected form without IPA of its own takes the IPA
 * of the form it sounds like, e.g. rires from rire. Resolves null on failure.
 */
export async function getWiktionaryPronunciation(word: string, language: string, followed = 0): Promise<WiktionaryPronunciation | null> {
  const lower = word.toLowerCase();
  const variants = [word, word === lower ? word.charAt(0).toUpperCase() + word.slice(1) : lower];
  let found: { html: string; pronunciation: WiktionaryPronunciation } | undefined;
  try {
    for (const title of variants) {
      const html = await fetchPageHtml(title);
      if (!html) continue;
      const pronunciation = { ipa: parseIpa(html, language), audio: parseAudio(html, language).slice(0, MAX_AUDIO) };
      found ??= { html, pronunciation };
      if (pronunciation.ipa.length > 0 || pronunciation.audio.length > 0) {
        found = { html, pronunciation };
        break;
      }
    }
  } catch (error) {
    console.warn(`Wiktionary pronunciation failed for "${word}":`, error);
    return null;
  }
  const pronunciation = found?.pronunciation ?? { ipa: [], audio: [] };
  const section = found && getLanguageSection(found.html, language);
  if (pronunciation.ipa.length > 0) return pronunciation;
  try {
    // A ge- past participle, e.g. gewartet from warten, aufgehört from aufhören, with or without a page
    const participle = await getParticipleIpa(word, section, language);
    if (participle) return { ...pronunciation, ipa: [participle.ipa], derivedFrom: [participle.lemma] };
  } catch {
    // The word's own recordings are still worth showing
  }
  // Another spelling of a word, e.g. heiss for heiß, or heiss with no page at all, sounds like it
  if (followed < 2) {
    try {
      const target = section ? getAlternativeSpellingTarget(section) : undefined;
      const targets = target && target.toLowerCase() !== lower ? [target] : [];
      // Also when the page exists but says nothing useful, e.g. a Swiss draussen
      if (!targets.length) targets.push(...germanEszettForms(word, language));
      for (const title of targets) {
        const sameSound = await getWiktionaryPronunciation(title, language, followed + 1);
        if (sameSound?.ipa.length) return { ...pronunciation, ipa: sameSound.ipa, audio: pronunciation.audio.length ? pronunciation.audio : sameSound.audio };
      }
    } catch {
      // The word's own recordings are still worth showing
    }
  }
  if (!found || !section) return pronunciation;
  // Only an inflection's ending is silent, e.g. not moment's
  if (isFormOf(section)) {
    for (const form of soundAlikeForms(lower, language)) {
      try {
        const html = await fetchPageHtml(form);
        const ipa = html ? parseIpa(html, language) : [];
        // Only the first, since the page lists others too, e.g. rire's /ʁjɑ̃/ besides /ʁiʁ/
        if (ipa.length > 0) return { ...pronunciation, ipa: ipa.slice(0, 1) };
      } catch {
        // The word's own recordings are still worth showing
      }
    }
  }
  try {
    // e.g. fang from fangen
    const stem = await getStemIpa(word, section, language);
    if (stem) return { ...pronunciation, ipa: [stem.ipa], derivedFrom: [stem.lemma] };
  } catch {
    // The word's own recordings are still worth showing
  }
  try {
    // e.g. Leichtigkeit from leicht +‎ -igkeit
    const derived = await getDerivedIpa(found.html, language, MAX_PART_DEPTH);
    if (derived) return { ...pronunciation, ipa: [derived.ipa], derivedFrom: derived.parts };
  } catch {
    // The word's own recordings are still worth showing
  }
  return pronunciation;
}
