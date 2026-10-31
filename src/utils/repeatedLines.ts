// Helpers for syncing repeated lyric lines: when one occurrence of a line is
// edited, split or merged, find the other occurrences and apply the same change.

const sameLine = (a: string, b: string) => a.trim() === b.trim();

/** Indices of lines matching `text`, other than `excludeIndex`. Blank text never matches. */
export function findRepeatedLines(lines: string[], text: string, excludeIndex: number): number[] {
  if (!text.trim()) return [];
  const result: number[] = [];
  lines.forEach((line, j) => {
    if (j !== excludeIndex && sameLine(line, text)) result.push(j);
  });
  return result;
}

export function applyEditToLines(lines: string[], targets: number[], text: string): string[] {
  const newLines = [...lines];
  targets.forEach((j) => { newLines[j] = text; });
  return newLines;
}

/**
 * Lines matching `original` that can be split into `parts` the same way.
 * `parts` must join back into `original` (a pure split, no edits). `exclude`
 * holds the indices of the lines the split itself produced.
 */
export function findSplitTargets(lines: string[], original: string, parts: string[], exclude: number[]): number[] {
  if (parts.length < 2 || parts.join('') !== original) return [];
  return lines.flatMap((line, j) => (!exclude.includes(j) && line === original ? [j] : []));
}

export function applySplitToLines(lines: string[], targets: number[], parts: string[]): string[] {
  const newLines = [...lines];
  [...targets].sort((a, b) => b - a).forEach((j) => { newLines.splice(j, 1, ...parts); });
  return newLines;
}

/**
 * Start indices of non-overlapping line pairs (j, j + 1) equal to (first, second)
 * that can be merged the same way. `excludeIndex` is the line the merge produced.
 */
export function findMergeTargets(lines: string[], first: string, second: string, excludeIndex: number): number[] {
  if (!first.trim() || !second.trim()) return [];
  const result: number[] = [];
  for (let j = 0; j < lines.length - 1; j++) {
    if (j === excludeIndex || j + 1 === excludeIndex) continue;
    if (lines[j] === first && lines[j + 1] === second) {
      result.push(j);
      j++;
    }
  }
  return result;
}

export function applyMergeToLines(lines: string[], targets: number[], joined: string): string[] {
  const newLines = [...lines];
  [...targets].sort((a, b) => b - a).forEach((j) => { newLines.splice(j, 2, joined); });
  return newLines;
}

/** Shifts the anchor index to where it sits after the targets were split or merged. */
export function shiftIndexAfterResize(index: number, targets: number[], delta: number): number {
  return index + targets.filter((j) => j < index).length * delta;
}

/** A line's words, lowercased without punctuation, split at spaces and hyphens: "Ba-da, ba-da!" -> ba, da */
const lineWords = (line: string): Set<string> =>
  new Set(line.toLowerCase().split(/[\s\-‐–—]+/).map((word) => word.replace(/[^\p{L}\p{N}']/gu, '')).filter(Boolean));

/**
 * Lines like a deleted one: the same words, however many times and in any order, e.g. "ba-da ba-da" for
 * "Ba-da ba-da ba-da!", so filler lines can be deleted together. Blank lines never match.
 */
export function findSimilarLines(lines: string[], deleted: string): number[] {
  const words = lineWords(deleted);
  if (words.size === 0) return [];
  return lines.flatMap((line, j) => {
    const other = lineWords(line);
    return other.size === words.size && [...other].every((word) => words.has(word)) ? [j] : [];
  });
}

export function applyDeleteToLines(lines: string[], targets: number[]): string[] {
  const remove = new Set(targets);
  return lines.filter((_, j) => !remove.has(j));
}
