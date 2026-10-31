import { splitLyricTokens } from './cleanLyrics';
import { isCjkWord } from './cjkWords';

/**
 * A line's pieces to rebuild it from: its words with their punctuation, or for a line written
 * without spaces, e.g. Japanese, its characters
 */
export function lineDrillPieces(line: string): string[] {
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1 || !words[0] || !isCjkWord(words[0].replace(/[^\p{L}]/gu, '').slice(0, 1))) return words;
  return splitLyricTokens(words[0]).filter((t) => t.trim());
}

/** The pieces' indexes shuffled, never in the line's own order when another order is possible */
export function shufflePieces(pieces: string[], random = Math.random): number[] {
  const order = pieces.map((_, i) => i);
  const distinct = new Set(pieces.map((p) => p.toLowerCase())).size > 1;
  for (let attempt = 0; attempt < 10; attempt++) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (!distinct || order.some((index, i) => pieces[index].toLowerCase() !== pieces[i].toLowerCase())) break;
  }
  return order;
}
