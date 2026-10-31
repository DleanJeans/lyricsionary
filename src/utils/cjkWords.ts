// Chinese and Japanese don't put spaces between words, so Learn lays their lyrics out one character
// at a time and joins the characters of saved words, e.g. 二人 in 二人だけの空, back into one word

const CJK = '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}';
/** A Chinese or Japanese token: one or more characters, a long vowel mark kept with its kana (ラー) */
const CJK_WORD = new RegExp(`^[${CJK}][${CJK}ー]*$`, 'u');
/** The longest saved word looked for, in characters */
const MAX_WORD_LENGTH = 8;

export const isCjkWord = (token: string): boolean => CJK_WORD.test(token);

/**
 * Joins runs of single Chinese or Japanese character tokens into the longest words `isWord` accepts,
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

/** Characters in a Chinese or Japanese word, each counted as a word of the song: 二人 is 2, ラー is 1 */
export const cjkCharacterCount = (word: string): number => word.replace(/ー/g, '').length;
