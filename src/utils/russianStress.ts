// Russian, Ukrainian and Belarusian don't write which syllable is stressed, though learners need it, so
// Learn marks it on saved words from their IPA, as dictionaries do: любо́вь for /lʲʊˈbofʲ/

const STRESS_MARK = '́';
const CYRILLIC_VOWEL = /[аеёиоуыэюяіїєАЕЁИОУЫЭЮЯІЇЄ]/;
/** IPA vowels, each the core of a syllable unless marked non-syllabic (u̯) */
const IPA_VOWEL = /[aeiouyɐəɛɪɨɔʊʉæɵʌɑɒøœɯɤɘɜ]/;

/** Whether the song's language writes stress only in dictionaries */
export const isStressLanguage = (languages?: string[]): boolean =>
  !!languages?.some((language) =>
    ['russian', 'ru', 'ukrainian', 'uk', 'belarusian', 'be'].includes(language.toLowerCase())
  );

/** The text without the stress marks some lyrics and dictionaries write, e.g. любовь for любо́вь */
export const removeStressMarks = (text: string): string => text.replace(/([Ѐ-ӿ])́/g, '$1');

/**
 * The word with a stress mark on the vowel its IPA stresses, e.g. любо́вь for любовь and /lʲʊˈbofʲ/;
 * the word as it is when it has one vowel, a ё (always stressed), a mark already, or no stress in the IPA
 */
export function addStressMark(word: string, ipa: string): string {
  if (word.includes(STRESS_MARK) || /[ёЁ]/.test(word)) return word;
  const vowels = [...word].filter((char) => CYRILLIC_VOWEL.test(char)).length;
  if (vowels < 2) return word;
  const stress = ipa.indexOf('ˈ');
  if (stress < 0) return word;
  const before = [...ipa.slice(0, stress)];
  const stressedIndex = before.filter((char, i) => IPA_VOWEL.test(char) && before[i + 1] !== '̯').length;
  if (stressedIndex >= vowels) return word;
  let seen = 0;
  return [...word]
    .map((char) => (CYRILLIC_VOWEL.test(char) && seen++ === stressedIndex ? char + STRESS_MARK : char))
    .join('');
}
