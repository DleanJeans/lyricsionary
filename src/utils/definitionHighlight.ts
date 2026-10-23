import type { WiktionaryDefinition } from './wiktionary';

const WORD_CHAR = /[\p{L}\p{N}]/u;

// Curly apostrophes and quotes count as straight ones; same length, so indexes still line up.
function normalize(text: string): string {
  return text.toLowerCase().replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"');
}

// The whole definition first, then each part of a list like "to have; 've got".
function candidatesOf(definition: string): string[] {
  const whole = definition.replace(/\([^)]*\)/g, ' ').trim();
  const parts = whole.split(/[,;/]/).map((part) => part.trim());
  return [whole, ...parts].filter(Boolean);
}

// Finds the first definition that appears in the translation as whole words.
// An edge that isn't a letter, like the apostrophe in "'ve got", can sit inside a word ("I've got").
export function findDefinitionHighlight(text: string, definitions: string[]): [number, number] | null {
  const haystack = normalize(text);
  for (const definition of definitions) {
    for (const candidate of candidatesOf(definition)) {
      const needle = normalize(candidate);
      const checkBefore = WORD_CHAR.test(needle[0]);
      const checkAfter = WORD_CHAR.test(needle[needle.length - 1]);
      let index = haystack.indexOf(needle);
      while (index >= 0) {
        const before = haystack[index - 1];
        const after = haystack[index + needle.length];
        const okBefore = !checkBefore || !before || !WORD_CHAR.test(before);
        const okAfter = !checkAfter || !after || !WORD_CHAR.test(after);
        if (okBefore && okAfter) return [index, index + needle.length];
        index = haystack.indexOf(needle, index + 1);
      }
    }
  }
  return null;
}

// Verb definitions match without their "to", e.g. "to free; to rescue" as "free; rescue"
function withoutInfinitiveTo(definition: string): string {
  return definition.replace(/(^|[,;/]\s*)to\s+/gi, '$1');
}

// English -ing form of a verb: talk -> talking, make -> making, die -> dying, run -> running
export function toGerund(verb: string): string {
  const word = verb.toLowerCase();
  if (word.endsWith('ie')) return `${verb.slice(0, -2)}ying`;
  if (/[^aeiouy]e$/.test(word) && word !== 'be') return `${verb.slice(0, -1)}ing`;
  // One short vowel then one consonant doubles it (run, stop, sit), but not w, x or y (show, fix, play)
  if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(word)) return `${verb}${verb.slice(-1)}ing`;
  return `${verb}ing`;
}

// English plural of a noun: worry -> worries, kiss -> kisses, day -> days, dream -> dreams
export function toPlural(noun: string): string {
  const word = noun.toLowerCase();
  if (/[^aeiou]y$/.test(word)) return `${noun.slice(0, -1)}ies`;
  if (/(?:s|x|z|ch|sh)$/.test(word)) return `${noun}es`;
  return `${noun}s`;
}

// Each meaning in a list like "to give up; to quit (a job)", without parentheticals or "to"
function partsOf(definition: string): string[] {
  return definition
    .split(/[,;/]/)
    .map((part) => withoutInfinitiveTo(part.replace(/\([^)]*\)/g, ' ').trim()))
    .filter(Boolean);
}

// Each verb as its -ing form, e.g. "to give up; to quit" -> "giving up", "quitting"
function gerundsOf(definition: string): string[] {
  return partsOf(definition).map((part) => part.replace(/^\S+/, toGerund));
}

// Each noun as its plural, e.g. "worry; tax adviser" -> "worries", "tax advisers"
function pluralsOf(definition: string): string[] {
  return partsOf(definition).map((part) => part.replace(/\S+$/, toPlural));
}

// The definition to fill in by itself: the first that appears in the translation, or else the only one.
// A verb that only matches without its "to" is filled in without it, e.g. "free" for "Free me",
// or as its -ing form, e.g. "talking" for "He's talking". A noun can match as its plural, e.g.
// Sorgen's "worry" fills in "worries".
export function pickDefinition(definitions: WiktionaryDefinition[], translation?: string): string | null {
  const unique = [...new Map(definitions.filter((d) => d.text).map((d) => [d.text, d])).values()];
  if (translation) {
    for (const { text, partOfSpeech } of unique) {
      if (findDefinitionHighlight(translation, [text])) return text;
      if (partOfSpeech.toLowerCase() === 'noun') {
        const plural = pluralsOf(text).find((p) => findDefinitionHighlight(translation, [p]));
        if (plural) return plural;
      }
      if (partOfSpeech.toLowerCase() !== 'verb') continue;
      const withoutTo = withoutInfinitiveTo(text);
      if (findDefinitionHighlight(translation, [withoutTo])) return withoutTo;
      const gerund = gerundsOf(text).find((g) => findDefinitionHighlight(translation, [g]));
      if (gerund) return gerund;
    }
  }
  return unique.length === 1 ? unique[0].text : null;
}
