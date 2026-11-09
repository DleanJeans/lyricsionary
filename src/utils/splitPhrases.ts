import { cleanLyricWord, splitLyricTokens } from './cleanLyrics';
import { getWiktionaryLemmas } from './wiktionary';

/**
 * Phrases whose words sit apart in a line, e.g. the German separable verb "hört … auf" in
 * "Wann hört all dieser Schmerz auf?", or "turn … off" in "turn it off". They're saved as a form of
 * what Wiktionary calls them (aufhören, turn off), written with an ellipsis between the parts.
 */
export const SPLIT_GAP = ' … ';

export const isSplitPhrase = (word: string | null | undefined): boolean => !!word && word.includes(SPLIT_GAP);

export const splitPhraseParts = (word: string): string[] => word.split(SPLIT_GAP).map((part) => part.trim()).filter(Boolean);

/**
 * A phrase from some words of a line, in line order: words next to each other join with spaces, words
 * apart with an ellipsis between each, e.g. hört, auf -> "hört … auf"; give, up -> "give up"
 */
export function joinLineWords(words: { word: string; index: number }[]): string {
  const together = words.every(({ index }, i) => i === 0 || index === words[i - 1].index + 1);
  return words.map(({ word }) => word).join(together ? ' ' : SPLIT_GAP);
}

export interface SplitPhraseHit {
  phrase: string;
  /** Which time the phrase comes up on its line, from 1 */
  occurrence: number;
  /** The tokens of each part, in order */
  indices: number[];
}

/**
 * Where split phrases come up in a line's tokens (words, spaces and punctuation, as Learn lays them
 * out): each part in order, the nearest one after the last, all in the same clause (no , ; . ! ? between)
 */
export function findSplitPhrases(tokens: string[], phrases: Iterable<string>): SplitPhraseHit[] {
  const words = tokens.map((token) => cleanLyricWord(token).toLowerCase());
  // A clause ends after a token with , ; : . ! or ?
  const clauseEnds = tokens.map((token) => /[,;:.!?¿¡]/.test(token));
  const used = new Set<number>();
  const hits: SplitPhraseHit[] = [];
  for (const phrase of phrases) {
    const parts = splitPhraseParts(phrase.toLowerCase());
    if (parts.length < 2) continue;
    let occurrence = 0;
    for (let start = 0; start < tokens.length; start++) {
      if (words[start] !== parts[0] || used.has(start)) continue;
      const indices = [start];
      for (let i = start, p = 1; p < parts.length && !clauseEnds[i]; ) {
        i++;
        if (i >= tokens.length) break;
        if (words[i] === parts[p] && !used.has(i)) {
          indices.push(i);
          p++;
        }
      }
      if (indices.length !== parts.length) continue;
      indices.forEach((i) => used.add(i));
      hits.push({ phrase, occurrence: ++occurrence, indices });
    }
  }
  return hits;
}

// German separable verb particles, e.g. auf in "hört … auf" (aufhören)
const GERMAN_PARTICLES = new Set([
  'ab', 'an', 'auf', 'aus', 'bei', 'ein', 'fest', 'fort', 'her', 'heraus', 'herein', 'herum', 'hin', 'hinaus',
  'hinein', 'los', 'mit', 'nach', 'vor', 'voran', 'vorbei', 'weg', 'weiter', 'zu', 'zurück', 'zusammen', 'dazu',
  'hoch', 'runter', 'rein', 'raus', 'um', 'durch', 'nieder', 'wieder', 'kennen', 'statt', 'teil', 'frei',
]);
// Words that join clauses without taking the verb's place, e.g. und in "und dann hört er auf"
const GERMAN_JOINERS = new Set(['und', 'aber', 'oder', 'denn', 'sondern', 'doch']);

/**
 * The separable verb a tapped German word could be part of: when it's the first or second word of its
 * clause (where a German verb goes) and the clause ends with a particle, e.g. hört in "Wann hört all
 * dieser Schmerz auf?" -> "hört … auf", or "Steh auf" with the particle right after it. `at` is the
 * tapped word's token.
 */
export function germanSeparableVerb(tokens: string[], at: number): { phrase: string; indices: number[] } | null {
  const word = cleanLyricWord(tokens[at] ?? '');
  if (!word || word.includes(' ') || GERMAN_PARTICLES.has(word.toLowerCase())) return null;
  const isWord = (i: number) => !!cleanLyricWord(tokens[i] ?? '');
  const endsClause = (i: number) => /[,;:.!?¿¡]/.test(tokens[i] ?? '');
  // The tapped word's place in its clause, not counting a joining word that starts it
  const before: string[] = [];
  for (let i = at - 1; i >= 0 && !endsClause(i); i--) if (isWord(i)) before.unshift(cleanLyricWord(tokens[i]).toLowerCase());
  if (before.length && GERMAN_JOINERS.has(before[0])) before.shift();
  const place = before.length;
  if (place > 1) return null;
  // The clause's last word, when it's a particle
  let last = -1;
  for (let i = at; i < tokens.length; i++) {
    if (isWord(i)) last = i;
    if (endsClause(i)) break;
  }
  if (last <= at) return null;
  const particle = cleanLyricWord(tokens[last]);
  if (!GERMAN_PARTICLES.has(particle.toLowerCase())) return null;
  const apart = tokens.slice(at + 1, last).some((_, i) => isWord(at + 1 + i));
  return { phrase: `${word}${apart ? SPLIT_GAP : ' '}${particle}`, indices: [at, last] };
}

/** Whether a word is a German separable verb particle, e.g. auf */
export const isGermanParticle = (word: string) => GERMAN_PARTICLES.has(word.toLowerCase());

/**
 * Which time a phrase (or word) comes up on a line, counting the ones that start before `start`, the
 * character it starts at: hört … auf with its parts apart, "give up" with them next to each other
 */
export function phraseOccurrenceAt(line: string, phrase: string, start: number): number {
  const tokens = splitLyricTokens(line);
  const offsets: number[] = [];
  let offset = 0;
  for (const token of tokens) {
    offsets.push(offset);
    offset += token.length;
  }
  if (isSplitPhrase(phrase)) {
    const hits = findSplitPhrases(tokens, [phrase]);
    const before = hits.filter((hit) => offsets[hit.indices[0]] < start).length;
    return Math.max(1, Math.min(before + 1, hits.length));
  }
  const parts = phrase.toLowerCase().split(/\s+/).filter(Boolean);
  const words = tokens
    .map((token, i) => ({ word: cleanLyricWord(token).toLowerCase(), at: offsets[i] }))
    .filter((w) => w.word)
    // A token like "tout à fait" stands for its words, all starting where it does
    .flatMap((w) => w.word.split(' ').map((word) => ({ word, at: w.at })));
  let count = 0;
  for (let i = 0; i + parts.length <= words.length && words[i].at < start; i++) {
    if (parts.every((part, p) => words[i + p].word === part)) count++;
  }
  return count + 1;
}

/**
 * What Wiktionary may call a phrase whose words sit apart, or a German verb with its particle, to look
 * it up by, best first: "hört auf" for hört … auf, then aufhören; "turn off" for turn … off
 */
export async function phraseLookupWords(phrase: string, language: string, german: boolean): Promise<string[]> {
  const split = isSplitPhrase(phrase);
  const parts = split ? splitPhraseParts(phrase) : phrase.trim().split(/\s+/);
  if (parts.length < 2) return [];
  // The words together first, e.g. "hört auf", which Wiktionary may have as its own entry
  const words: string[] = split ? [parts.join(' ')] : [];
  if (german && parts.length === 2 && isGermanParticle(parts[1])) {
    const particle = parts[1].toLowerCase();
    const verb = parts[0].toLowerCase();
    const lemmas = await getWiktionaryLemmas(verb, language).catch(() => [] as string[]);
    for (const lemma of [...lemmas, verb]) words.push(particle + lemma.toLowerCase());
  }
  return [...new Set(words)];
}
