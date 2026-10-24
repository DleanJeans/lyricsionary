// Letters that fold to more than one, so "coeur" finds "cœur" and "strasse" finds "Straße"
const LIGATURES: Record<string, string> = { œ: 'oe', æ: 'ae', ß: 'ss' };

/**
 * Text lowercased without accents ("Corazón" -> "corazon"), with the index in the original text
 * each folded character comes from, for mapping matches back
 */
function fold(text: string): { folded: string; origins: number[] } {
  let folded = '';
  const origins: number[] = [];
  let index = 0;
  for (const char of text) {
    const lower = char.toLowerCase();
    const plain = LIGATURES[lower] ?? lower.normalize('NFD').replace(/\p{M}/gu, '');
    for (const c of plain) {
      folded += c;
      origins.push(index);
    }
    index += char.length;
  }
  origins.push(index);
  return { folded, origins };
}

/** Where the query appears in the text, ignoring case and accents, as [start, end) ranges of the text */
export function findSearchMatches(text: string, query: string): Array<[number, number]> {
  const q = fold(query.trim()).folded;
  if (!q) return [];
  const { folded, origins } = fold(text);
  const matches: Array<[number, number]> = [];
  for (let i = folded.indexOf(q); i >= 0; i = folded.indexOf(q, i + q.length)) {
    // The end extends over the whole last original character, e.g. both letters of "œ"
    const last = origins[i + q.length - 1];
    let end = origins[i + q.length];
    if (end === last) end = origins.find((o) => o > last) ?? text.length;
    matches.push([origins[i], end]);
  }
  return matches;
}

/** Whether the text contains the query, ignoring case and accents, e.g. "corazon" in "Mi corazón" */
export function matchesSearch(text: string | undefined, query: string): boolean {
  if (!text) return false;
  const q = fold(query.trim()).folded;
  return !q || fold(text).folded.includes(q);
}
