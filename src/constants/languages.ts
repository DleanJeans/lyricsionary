export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  // Less common lyrics languages, alphabetically. Names match Wiktionary's language sections.
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'sq', name: 'Albanian', flag: '🇦🇱' },
  { code: 'hy', name: 'Armenian', flag: '🇦🇲' },
  { code: 'eu', name: 'Basque', flag: '🇪🇸' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'bs', name: 'Bosnian', flag: '🇧🇦' },
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
  { code: 'yue', name: 'Cantonese', flag: '🇭🇰' },
  { code: 'ca', name: 'Catalan', flag: '🇦🇩' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'eo', name: 'Esperanto', flag: '🌐' },
  { code: 'et', name: 'Estonian', flag: '🇪🇪' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'gl', name: 'Galician', flag: '🇪🇸' },
  { code: 'ka', name: 'Georgian', flag: '🇬🇪' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'ht', name: 'Haitian Creole', flag: '🇭🇹' },
  { code: 'haw', name: 'Hawaiian', flag: '🌺' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'is', name: 'Icelandic', flag: '🇮🇸' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'ga', name: 'Irish', flag: '🇮🇪' },
  { code: 'kk', name: 'Kazakh', flag: '🇰🇿' },
  { code: 'la', name: 'Latin', flag: '🏛️' },
  { code: 'lv', name: 'Latvian', flag: '🇱🇻' },
  { code: 'lt', name: 'Lithuanian', flag: '🇱🇹' },
  { code: 'mk', name: 'Macedonian', flag: '🇲🇰' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾' },
  { code: 'mn', name: 'Mongolian', flag: '🇲🇳' },
  { code: 'ne', name: 'Nepali', flag: '🇳🇵' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'fa', name: 'Persian', flag: '🇮🇷' },
  { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'sr', name: 'Serbian', flag: '🇷🇸' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovene', flag: '🇸🇮' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
  { code: 'tl', name: 'Tagalog', flag: '🇵🇭' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'cy', name: 'Welsh', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  { code: 'yo', name: 'Yoruba', flag: '🇳🇬' },
  { code: 'zu', name: 'Zulu', flag: '🇿🇦' },
];

// A song's lyrics written in the Latin alphabet, e.g. Japanese romaji, kept as one of its translations
export const ROMANIZED = { code: 'romanized', name: 'Romanized', flag: '🔤' };

export function isRomanized(language: string): boolean {
  return language === ROMANIZED.name;
}

// Lyrics languages not written in the Latin alphabet, which a romanized version helps to read
const NON_LATIN_LANGUAGES = new Set([
  'Japanese', 'Korean', 'Chinese', 'Cantonese', 'Russian', 'Arabic', 'Hindi', 'Thai', 'Armenian', 'Bengali',
  'Bulgarian', 'Georgian', 'Greek', 'Hebrew', 'Kazakh', 'Macedonian', 'Mongolian', 'Nepali', 'Persian',
  'Punjabi', 'Serbian', 'Tamil', 'Telugu', 'Ukrainian', 'Urdu',
]);

// The languages a song's translation can be in: Romanized first for a song not in the Latin alphabet
export function translationLanguagesFor(originalLanguages: string[] = []) {
  const nonLatin = originalLanguages.some((language) => NON_LATIN_LANGUAGES.has(getLanguageNameFromCode(language) ?? ''));
  return nonLatin ? [ROMANIZED, ...LANGUAGES] : LANGUAGES;
}

// What lyrics sites call a romanized version, e.g. LyricsTranslate's "Transliteration"
const ROMANIZED_LABEL = /\b(?:romani[sz]ations?|romani[sz]ed|transliterations?|romaji|rōmaji|romaja|pinyin|jyutping)\b/i;

// The translation language a label names, Romanized included
export function findTranslationLanguageName(label: string): string | null {
  return ROMANIZED_LABEL.test(label) ? ROMANIZED.name : findLanguageName(label);
}

// Whether most of a text's letters are Latin ones, e.g. romaji rather than kana and kanji
export function isMostlyLatin(text: string): boolean {
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  const latin = text.match(/[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/g)?.length ?? 0;
  return letters > 0 && latin / letters >= 0.8;
}

export function getFlagForLanguage(langName: string): string {
  if (isRomanized(langName)) return ROMANIZED.flag;
  const lang = LANGUAGES.find(
    (l) => l.name.toLowerCase() === langName.toLowerCase() || l.code.toLowerCase() === langName.toLowerCase()
  );
  return lang?.flag ?? '🌐';
}

const RTL_LANGUAGES = new Set(['Arabic', 'Hebrew', 'Persian', 'Urdu']);

// Whether a language is written right to left, by name or code
export function isRtlLanguage(language: string): boolean {
  const name = getLanguageNameFromCode(language);
  return !!name && RTL_LANGUAGES.has(name);
}

// Also accepts an English language name, which some lyrics sites give instead of a code, and a
// code with a region, e.g. "pt-BR" or "es_419"
export function getLanguageNameFromCode(code: string): string | null {
  if (!code) return null;
  const lower = code.toLowerCase();
  const base = lower.split(/[-_]/)[0];
  const lang =
    LANGUAGES.find((l) => l.code === lower || l.name.toLowerCase() === lower) ??
    LANGUAGES.find((l) => l.code === base);
  return lang?.name ?? null;
}

// A key that's the same for a language given as a name or a code, e.g. "french" for "fr" and "French"
export function languageKey(language: string): string {
  return (getLanguageNameFromCode(language) ?? language).toLowerCase();
}

// Whether two song languages are the same language, given as names or codes, e.g. "fr" and "French"
export function isSameLanguage(a: string, b: string): boolean {
  return languageKey(a) === languageKey(b);
}

// The language a label names, e.g. "English" in "English translation" or "Love Song (English)", or a code
export function findLanguageName(label: string): string | null {
  const byCode = getLanguageNameFromCode(label.trim());
  if (byCode) return byCode;
  const words = label.toLowerCase().split(/[^\p{L}]+/u);
  // Longest first, so "Haitian Creole" wins over a shorter name inside it
  const named = [...LANGUAGES]
    .sort((a, b) => b.name.length - a.name.length)
    .find((l) => {
      const parts = l.name.toLowerCase().split(' ');
      return words.some((_, i) => parts.every((part, j) => words[i + j] === part));
    });
  return named?.name ?? null;
}

// Languages whose name or code starts with the query, ignoring case and accents, e.g. "cat" or "ca"
// for Catalan; a name's later words match too, e.g. "creole" for Haitian Creole
export function searchLanguages<T extends { code: string; name: string }>(languages: T[], query: string): T[] {
  const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const q = fold(query.trim());
  if (!q) return languages;
  return languages.filter((l) => l.code === q || fold(l.name).split(/\s+/).some((word) => word.startsWith(q)));
}
