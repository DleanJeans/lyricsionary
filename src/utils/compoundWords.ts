export interface CompoundPart {
  // Segment as it appears in the word (keeps original casing and any linking element)
  text: string;
  // Lowercased segment without linking element, for matching saved words (e.g. "Liebes" -> "liebe")
  lemma: string;
  // Form to look up: the saved word's spelling when known, else the lemma; capitalized when the
  // compound is (German nouns keep their capital, e.g. "Liebesbrief" -> "Liebe", "Brief")
  lookup: string;
}

// Lowercased known words, optionally mapped to their saved spelling
export type KnownWords = ReadonlySet<string> | ReadonlyMap<string, string>;

const MIN_PART_LENGTH = 3;

// German linking elements (Fugenelemente) that can join compound parts, e.g. Liebe+s+brief
const LINKING_ELEMENTS = ['es', 'en', 's', 'n', 'e'];

export function isGermanLanguage(languages?: string[]): boolean {
  return !!languages?.some((l) => ['german', 'de'].includes(l.toLowerCase()));
}

/**
 * Parse a user-entered split like "Liebes-brief" or "Liebes brief" into parts.
 * Returns null if the parts don't spell the word or there's only one part.
 */
export function parseManualSplit(word: string, input: string): string[] | null {
  const parts = input.split(/[\s\-·|]+/).filter(Boolean);
  if (parts.length < 2) return null;
  if (parts.join('').toLowerCase() !== word.toLowerCase()) return null;
  return parts;
}

/** Character positions where the segments meet, e.g. ["Liebes", "brief"] -> [6] */
export function getSplitPositions(segments: string[]): number[] {
  const positions: number[] = [];
  let pos = 0;
  for (const segment of segments.slice(0, -1)) {
    pos += Array.from(segment).length;
    positions.push(pos);
  }
  return positions;
}

/** Cut a word at character positions, e.g. ("Liebesbrief", [6]) -> ["Liebes", "brief"] */
export function splitAtPositions(word: string, positions: number[]): string[] {
  const chars = Array.from(word);
  const cuts = [...new Set(positions)].filter((p) => p > 0 && p < chars.length).sort((a, b) => a - b);
  return [0, ...cuts].map((start, i) => chars.slice(start, cuts[i] ?? chars.length).join(''));
}

/**
 * Turn a list of segments into CompoundParts using the word's own casing.
 * Linking elements are stripped from the lemma when the stripped form is known.
 */
export function toCompoundParts(word: string, segments: string[], knownWords: KnownWords): CompoundPart[] {
  const isCapitalized = word[0] !== word[0].toLowerCase();
  let pos = 0;
  return segments.map((segment, i) => {
    const text = word.slice(pos, pos + segment.length);
    pos += segment.length;
    const lower = text.toLowerCase();
    let lemma = lower;
    if (i < segments.length - 1 && !knownWords.has(lower)) {
      const link = LINKING_ELEMENTS.find(
        (l) => lower.endsWith(l) && knownWords.has(lower.slice(0, -l.length))
      );
      if (link) lemma = lower.slice(0, -link.length);
    }
    const saved = (knownWords instanceof Map ? knownWords.get(lemma) : undefined) ?? lemma;
    // Parts of a capitalized compound are nouns, even when saved lowercase (e.g. "liebe" the verb)
    const lookup = isCapitalized ? saved.charAt(0).toUpperCase() + saved.slice(1) : saved;
    return { text, lemma, lookup };
  });
}

/**
 * Automatically split a compound word into known words (lowercased set).
 * Prefers the segmentation with the fewest parts. Returns null if the word
 * is itself known or can't be fully split into at least two known parts.
 */
export function splitCompound(word: string, knownWords: KnownWords): CompoundPart[] | null {
  const lower = word.toLowerCase();
  if (lower.length < MIN_PART_LENGTH * 2 || knownWords.has(lower)) return null;

  const matchPart = (piece: string, isLast: boolean): boolean => {
    if (piece.length < MIN_PART_LENGTH) return false;
    if (knownWords.has(piece)) return true;
    if (isLast) return false;
    return LINKING_ELEMENTS.some(
      (l) =>
        piece.endsWith(l) &&
        piece.length - l.length >= MIN_PART_LENGTH &&
        knownWords.has(piece.slice(0, -l.length))
    );
  };

  // best[i] = fewest-part segmentation of lower.slice(i), as segment end indices
  const best: (number[] | null)[] = new Array(lower.length + 1).fill(null);
  best[lower.length] = [];
  for (let i = lower.length - 1; i >= 0; i--) {
    for (let j = lower.length; j >= i + MIN_PART_LENGTH; j--) {
      const rest = best[j];
      if (!rest) continue;
      if (!matchPart(lower.slice(i, j), j === lower.length)) continue;
      if (!best[i] || rest.length + 1 < best[i]!.length) {
        best[i] = [j, ...rest];
      }
    }
  }

  const ends = best[0];
  if (!ends || ends.length < 2) return null;

  let start = 0;
  const segments = ends.map((end) => {
    const segment = lower.slice(start, end);
    start = end;
    return segment;
  });
  return toCompoundParts(word, segments, knownWords);
}

/**
 * Get compound parts for a word: a manual split saved by the user wins,
 * otherwise try an automatic split from known words.
 */
export function getCompoundParts(
  word: string,
  manualSplits: Record<string, string[]>,
  knownWords: KnownWords
): CompoundPart[] | null {
  const manual = manualSplits[word.toLowerCase()];
  if (manual && manual.join('').toLowerCase() === word.toLowerCase()) {
    return toCompoundParts(word, manual, knownWords);
  }
  return splitCompound(word, knownWords);
}

/**
 * Map saved German words (lowercased) to their saved spelling, to split compounds with.
 */
export function buildKnownGermanWords(words: { word: string; language: string }[]): Map<string, string> {
  return new Map(words.filter((w) => isGermanLanguage([w.language])).map((w) => [w.word.toLowerCase(), w.word]));
}
