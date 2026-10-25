import type { WiktionaryDefinition } from './wiktionary';

export const PARTS_OF_SPEECH = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'determiner',
  'interjection',
  'numeral',
  'particle',
  'phrase',
  'other',
] as const;

export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

// Wiktionary headings that belong to a broader type, e.g. "Proper noun" is a noun
const HEADING_TYPES: Record<string, PartOfSpeech> = {
  'proper noun': 'noun',
  article: 'determiner',
  participle: 'adjective',
  'past participle': 'adjective',
  'present participle': 'adjective',
  contraction: 'phrase',
  'prepositional phrase': 'phrase',
  idiom: 'phrase',
  proverb: 'phrase',
  number: 'numeral',
  postposition: 'preposition',
  circumposition: 'preposition',
  'relative pronoun': 'pronoun',
  'personal pronoun': 'pronoun',
};

/** The type of a Wiktionary part-of-speech heading, e.g. "Proper noun" -> noun, "Letter" -> other */
export function normalizePartOfSpeech(heading?: string): PartOfSpeech | undefined {
  const lower = heading?.trim().toLowerCase();
  if (!lower) return undefined;
  if ((PARTS_OF_SPEECH as readonly string[]).includes(lower)) return lower as PartOfSpeech;
  return HEADING_TYPES[lower] ?? 'other';
}

// The meanings of a definition, without a verb's "to", e.g. "to liberate; to free" -> liberate, free
const meanings = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[;,]/)
    .map((part) => part.trim().replace(/^to\s+/, '').replace(/[.!?]+$/, ''))
    .filter(Boolean);

/**
 * The type of a saved definition, from the Wiktionary definition it was picked from or shares a
 * meaning with, or the only type the word has. Undefined when it can't tell, e.g. Leben "life" when
 * the definition typed was "living".
 */
export function findPartOfSpeech(
  definition: string | undefined,
  suggestions: WiktionaryDefinition[]
): PartOfSpeech | undefined {
  const types = suggestions.map((s) => normalizePartOfSpeech(s.partOfSpeech));
  if (definition?.trim()) {
    const wanted = meanings(definition);
    const whole = wanted.join(';');
    const exact = suggestions.findIndex((s) => meanings(s.text).join(';') === whole);
    if (exact >= 0 && types[exact]) return types[exact];
    const shared = suggestions.findIndex((s) => meanings(s.text).some((m) => wanted.includes(m)));
    if (shared >= 0 && types[shared]) return types[shared];
  }
  const distinct = new Set(types.filter(Boolean));
  return distinct.size === 1 ? [...distinct][0] : undefined;
}

/**
 * The contexts with a word type found for each definition that has none, or null when none was
 * found, for words saved before types were
 */
export function fillPartsOfSpeech<T extends { definition?: string; partOfSpeech?: PartOfSpeech }>(
  contexts: T[],
  suggestions: WiktionaryDefinition[]
): T[] | null {
  let changed = false;
  const filled = contexts.map((context) => {
    if (context.partOfSpeech || !context.definition?.trim()) return context;
    const partOfSpeech = findPartOfSpeech(context.definition, suggestions);
    if (!partOfSpeech) return context;
    changed = true;
    return { ...context, partOfSpeech };
  });
  return changed ? filled : null;
}
