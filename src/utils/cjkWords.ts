import { cleanLyricWord, splitLyricTokens } from './cleanLyrics';

// Chinese, Japanese and Thai don't put spaces between words, so Learn lays their lyrics out one
// character at a time and joins the characters of saved words, e.g. 二人 in 二人だけの空 or ความรัก,
// back into one word

const CJK = '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}';
/** A Chinese or Japanese token: one or more characters, a long vowel mark kept with its kana (ラー) */
const CJK_WORD = new RegExp(`^[${CJK}][${CJK}ー]*$`, 'u');
/** The longest saved word looked for, in characters */
const MAX_WORD_LENGTH = 8;

/** A Thai token: consonants with their vowel and tone marks */
const THAI_WORD = /^[\u0E01-\u0E4E]+$/u;

/** Whether a token is Chinese, Japanese or Thai, written without spaces between words */
export const isCjkWord = (token: string): boolean => CJK_WORD.test(token) || THAI_WORD.test(token);

/**
 * Joins runs of single Chinese, Japanese or Thai character tokens into the longest words `isWord` accepts,
 * e.g. ["二", "人", "だ", "け"] -> ["二人", "だ", "け"] when 二人 is saved. Other tokens stay as they are.
 */
export function groupCjkTokens(tokens: string[], isWord: (word: string) => boolean): string[] {
  const grouped: string[] = [];
  for (let i = 0; i < tokens.length; ) {
    if (!isCjkWord(tokens[i])) {
      grouped.push(tokens[i++]);
      continue;
    }
    let end = i + 1;
    while (end < tokens.length && end - i < MAX_WORD_LENGTH && isCjkWord(tokens[end])) end++;
    let length = end - i;
    while (length > 1 && !isWord(tokens.slice(i, i + length).join(''))) length--;
    grouped.push(tokens.slice(i, i + length).join(''));
    i += length;
  }
  return grouped;
}

/**
 * Characters in a Chinese, Japanese or Thai word, each counted as a word of the song: 二人 is 2, ラー
 * is 1 and ไม่เป็นไร is 4, as Learn lays them out
 */
export const cjkCharacterCount = (word: string): number => splitLyricTokens(word).length;

/** The most words a phrase is looked for with, e.g. 3 for "tout à fait", 2 for Vietnamese yêu thương */
const MAX_SPACED_WORDS = 4;

const isSpace = (token: string) => /^[^\S\n]+$/.test(token);

/**
 * Joins words written apart into the longest phrase `isWord` accepts (asked without punctuation), e.g.
 * ["give", " ", "up,", " ", "baby"] -> ["give up,", " ", "baby"] or Vietnamese syllables into a word like
 * yêu thương
 */
export function groupSpacedWords(tokens: string[], isWord: (word: string) => boolean): string[] {
  const grouped: string[] = [];
  for (let i = 0; i < tokens.length; ) {
    if (!tokens[i].trim()) {
      grouped.push(tokens[i++]);
      continue;
    }
    // Word tokens i, i + 2, ... with single spaces between them
    let end = i + 1;
    while (end + 1 < tokens.length && (end - i) / 2 < MAX_SPACED_WORDS - 1 && isSpace(tokens[end]) && tokens[end + 1].trim()) end += 2;
    while (end > i + 1 && !isWord(cleanLyricWord(tokens.slice(i, end).join('')))) end -= 2;
    grouped.push(tokens.slice(i, end).join(''));
    i = end;
  }
  return grouped;
}
