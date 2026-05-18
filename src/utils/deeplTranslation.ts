/**
 * Removes duplicate lines from lyrics to fit within DeepL's 1500 character limit.
 * Returns the deduplicated text and a mapping array to restore duplicates later.
 *
 * @param lyrics - Original lyrics with potentially repeating lines (like chorus)
 * @returns Object with deduplicated text and line mapping
 */
export function deduplicateLines(lyrics: string): {
  deduplicated: string;
  lineMap: number[];  // Maps original line index to deduplicated line index
} {
  const lines = lyrics.split('\n');
  const uniqueLines: string[] = [];
  const lineMap: number[] = [];
  const seenLines = new Map<string, number>(); // Maps line content to its index in uniqueLines

  lines.forEach((line) => {
    const existing = seenLines.get(line);
    if (existing !== undefined) {
      // Line already exists, map to existing index
      lineMap.push(existing);
    } else {
      // New unique line
      const newIndex = uniqueLines.length;
      uniqueLines.push(line);
      seenLines.set(line, newIndex);
      lineMap.push(newIndex);
    }
  });

  return {
    deduplicated: uniqueLines.join('\n'),
    lineMap,
  };
}

/**
 * Restores duplicate lines in translation using the original line mapping.
 *
 * @param translatedText - Translation with deduplicated lines
 * @param lineMap - Mapping from original to deduplicated line indices
 * @returns Translation with duplicates restored
 */
export function remapTranslation(translatedText: string, lineMap: number[]): string {
  const translatedLines = translatedText.split('\n');
  const remappedLines = lineMap.map((deduplicatedIndex) => {
    return translatedLines[deduplicatedIndex] ?? '';
  });
  return remappedLines.join('\n');
}
