import { removeSpecialChars, splitLyricTokens } from './cleanLyrics';
import { isCjkWord } from './cjkWords';

export type DictationMark = 'right' | 'close' | 'missed';

export interface DictationWord {
  /** The word as the lyrics write it, with its punctuation */
  text: string;
  mark: DictationMark;
}

export interface DictationResult {
  words: DictationWord[];
  /** Words typed that aren't in the line */
  extra: string[];
  right: number;
}

/** A line's words, or for a line written without spaces, e.g. Japanese, its characters */
function pieces(line: string): string[] {
  return splitLyricTokens(line).filter((token) => token.trim() && removeSpecialChars(token));
}

const plain = (word: string) => removeSpecialChars(word).toLowerCase().replace(/[’`]/g, "'");
// Without accents, e.g. "coeur" for cœur or "deja" for déjà, which counts as close
const bare = (word: string) => plain(word).normalize('NFD').replace(/\p{M}/gu, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae');

/**
 * Compares a typed line with the lyrics word by word, lining them up so a missed or extra word
 * doesn't throw off the rest: right, close (only accents differ) or missed
 */
export function checkDictation(line: string, typed: string): DictationResult {
  const expected = pieces(line);
  // Typed text for a line without spaces is split the same way
  const typedPieces = isCjkWord(expected[0] ?? '') ? pieces(typed.replace(/\s+/g, '')) : pieces(typed);
  const a = expected.map(bare);
  const b = typedPieces.map(bare);
  // Longest common subsequence, ignoring accents
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const words: DictationWord[] = [];
  const extra: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      words.push({ text: expected[i], mark: plain(expected[i]) === plain(typedPieces[j]) ? 'right' : 'close' });
      i++;
      j++;
    } else if (j < b.length && (i === a.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
      extra.push(typedPieces[j]);
      j++;
    } else {
      words.push({ text: expected[i], mark: 'missed' });
      i++;
    }
  }
  return { words, extra, right: words.filter((w) => w.mark === 'right').length };
}
