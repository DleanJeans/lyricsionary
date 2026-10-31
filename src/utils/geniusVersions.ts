import { ROMANIZED, findTranslationLanguageName, getLanguageNameFromCode } from '../constants/languages';

// A version of a song on Genius, from its Translations dropdown: the original, a Romanization or a
// translation. language is Genius's code, e.g. "ja", "zh-Hant" or "romanization", or the dropdown's label.
// text is missing when the page couldn't be fetched, e.g. behind Genius's captcha
export interface GeniusVersion {
  url: string;
  language: string;
  isOriginal: boolean;
  text?: string;
  title?: string;
}

export interface GeniusTranslation {
  language: string;
  lyrics: string;
  url: string;
  title?: string;
}

// The versions from a newly scraped page, keeping the text of ones fetched earlier for the same song
export function mergeGeniusVersions(previous: GeniusVersion[] | null, next: GeniusVersion[]): GeniusVersion[] {
  if (!previous || !previous.some((p) => next.some((n) => n.url === p.url))) return next;
  const byUrl = new Map(previous.map((v) => [v.url, v]));
  next.forEach((v) => {
    const earlier = byUrl.get(v.url);
    byUrl.set(v.url, v.text ? v : { ...v, text: earlier?.text, title: earlier?.title });
  });
  return [...byUrl.values()];
}

export function translationLanguageOf(version: GeniusVersion): string | null {
  return findTranslationLanguageName(version.language);
}

// The original and a translation tab for each other version, Romanized first. A version in the original's
// language or one no language is known for is left out, and so is a second one for the same language
export function splitGeniusVersions(versions: GeniusVersion[]): {
  original: GeniusVersion;
  translations: GeniusTranslation[];
} {
  const original = versions.find((v) => v.isOriginal) ?? versions[0];
  const originalLanguage = getLanguageNameFromCode(original.language) ?? findTranslationLanguageName(original.language);
  const translations: GeniusTranslation[] = [];
  versions.forEach((v) => {
    if (v === original || !v.text) return;
    const language = translationLanguageOf(v);
    if (!language || language === originalLanguage || translations.some((t) => t.language === language)) return;
    translations.push({ language, lyrics: v.text, url: v.url, title: v.title });
  });
  translations.sort((a, b) => Number(b.language === ROMANIZED.name) - Number(a.language === ROMANIZED.name));
  return { original, translations };
}
