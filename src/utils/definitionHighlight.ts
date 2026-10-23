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

// The definition to fill in by itself: the first that appears in the translation, or else the only one.
// A verb that only matches without its "to" is filled in without it, e.g. "free" for "Free me".
export function pickDefinition(definitions: WiktionaryDefinition[], translation?: string): string | null {
  const unique = [...new Map(definitions.filter((d) => d.text).map((d) => [d.text, d])).values()];
  if (translation) {
    for (const { text, partOfSpeech } of unique) {
      if (findDefinitionHighlight(translation, [text])) return text;
      if (partOfSpeech.toLowerCase() !== 'verb') continue;
      const withoutTo = withoutInfinitiveTo(text);
      if (findDefinitionHighlight(translation, [withoutTo])) return withoutTo;
    }
  }
  return unique.length === 1 ? unique[0].text : null;
}
