const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/**
 * Where `word` appears in `text` as a whole word, ignoring case, as [start, end] ranges. A word
 * inside another word doesn't count ("a" in "la"), but one after an elision does ("amour" in
 * "l'amour"); unlike \b, accented edges work ("été").
 */
export function findWordOccurrences(text: string, word: string): Array<[number, number]> {
  if (!word || !text) return [];
  const haystack = text.toLowerCase();
  const needle = word.toLowerCase();
  // Lowercasing changed the length (rare, e.g. "İ"): ranges into it wouldn't fit the text
  if (haystack.length !== text.length) return [];
  const ranges: Array<[number, number]> = [];
  for (let index = haystack.indexOf(needle); index >= 0; index = haystack.indexOf(needle, index + 1)) {
    const end = index + needle.length;
    const before = haystack[index - 1];
    const after = haystack[end];
    if ((!before || !LETTER_OR_DIGIT.test(before)) && (!after || !LETTER_OR_DIGIT.test(after))) {
      ranges.push([index, end]);
    }
  }
  return ranges;
}
