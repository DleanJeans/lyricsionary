// A song can have several translations in one language (e.g. English from Genius and from DeepL).
// The first of a language is keyed by the language, the next ones by "English 2", "English 3"...
// A translation's label, when set, is the name shown for it.
export interface TranslationName {
  /** Selects the translation in Learn */
  key: string;
  /** What the translation is called: its label, or the key */
  name: string;
  language: string;
  /** The language has more than one translation in the song */
  duplicated: boolean;
}

export function translationNames(translations: { language: string; label?: string }[]): TranslationName[] {
  const counts: Record<string, number> = {};
  translations.forEach((t) => { counts[t.language] = (counts[t.language] ?? 0) + 1; });
  const seen: Record<string, number> = {};
  return translations.map((t) => {
    seen[t.language] = (seen[t.language] ?? 0) + 1;
    const n = seen[t.language];
    const key = n === 1 ? t.language : `${t.language} ${n}`;
    return { key, name: t.label?.trim() || key, language: t.language, duplicated: counts[t.language] > 1 };
  });
}
