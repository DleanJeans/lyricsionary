import { cleanLyricWord, splitLyricTokens } from './cleanLyrics';
import { groupCjkTokens, groupSpacedWords } from './cjkWords';

export interface WordSpot {
  lineIndex: number;
  /** Which time the word comes up on its line, from 1 */
  occurrence: number;
}

/**
 * Every place a word comes up in the song, tokenized the way Learn's lyrics are, so a spot selects
 * the same word as tapping it there. `isWord` says which words written apart join into one, e.g. a saved phrase.
 */
export function findWordSpots(lines: string[], word: string, isWord: (candidate: string) => boolean): WordSpot[] {
  const target = word.toLowerCase();
  const joins = (candidate: string) => candidate === word || isWord(candidate);
  const spots: WordSpot[] = [];
  lines.forEach((line, lineIndex) => {
    if (!line.trim()) return;
    let count = 0;
    for (const token of groupSpacedWords(groupCjkTokens(splitLyricTokens(line), joins), joins)) {
      if (!token.trim()) continue;
      const cleaned = cleanLyricWord(token).toLowerCase();
      if (!cleaned || cleaned !== target) continue;
      count++;
      spots.push({ lineIndex, occurrence: count });
    }
  });
  return spots;
}

/** The spot after (or before, with step -1) the current one, wrapping around the song */
export function stepWordSpot(spots: WordSpot[], current: WordSpot | null, step: 1 | -1): WordSpot | null {
  if (spots.length === 0) return null;
  const at = current ? spots.findIndex((s) => s.lineIndex === current.lineIndex && s.occurrence === current.occurrence) : -1;
  if (at === -1) return spots[step === 1 ? 0 : spots.length - 1];
  return spots[(at + step + spots.length) % spots.length];
}
