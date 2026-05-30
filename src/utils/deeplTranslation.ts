const DEEPL_CHAR_LIMIT = 1500;

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
 * Splits text into chunks that fit within DeepL's character limit.
 * Splits at line boundaries to preserve line structure.
 *
 * @param text - Text to split
 * @param maxChars - Maximum characters per chunk (default: 1500)
 * @returns Array of text chunks
 */
export function splitIntoChunks(text: string, maxChars: number = DEEPL_CHAR_LIMIT): string[] {
  // If text fits in one chunk, return as-is
  if (text.length <= maxChars) {
    return [text];
  }

  const lines = text.split('\n');
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const line of lines) {
    const lineLength = line.length + 1; // +1 for the newline character

    // If adding this line would exceed the limit, start a new chunk
    if (currentLength + lineLength > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'));
      currentChunk = [line];
      currentLength = lineLength;
    } else {
      currentChunk.push(line);
      currentLength += lineLength;
    }
  }

  // Add the last chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n'));
  }

  return chunks;
}

/**
 * Joins translated chunks back into a single text.
 *
 * @param chunks - Array of translated chunks
 * @returns Combined translated text
 */
export function joinChunks(chunks: string[]): string {
  return chunks.join('\n');
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
