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

export function getFlagForLanguage(langName: string): string {
  const lang = LANGUAGES.find(
    (l) => l.name.toLowerCase() === langName.toLowerCase() || l.code.toLowerCase() === langName.toLowerCase()
  );
  return lang?.flag ?? '🌐';
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

// Languages whose name or code starts with the query, ignoring case and accents, e.g. "cat" or "ca"
// for Catalan; a name's later words match too, e.g. "creole" for Haitian Creole
export function searchLanguages<T extends { code: string; name: string }>(languages: T[], query: string): T[] {
  const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const q = fold(query.trim());
  if (!q) return languages;
  return languages.filter((l) => l.code === q || fold(l.name).split(/\s+/).some((word) => word.startsWith(q)));
}
