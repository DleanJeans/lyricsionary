import { getFaviconUrl } from './getFaviconUrl';

// A song can have several translations in one language (e.g. English from Genius and from DeepL).
// The first of a language is keyed by the language, the next ones by "English 2", "English 3"...
// A translation's label, when set, is the name shown for it.
export interface TranslationName {
  /** Selects the translation in Learn */
  key: string;
  /** What the translation is called: its label, or the key */
  name: string;
  language: string;
  /** The site's icon, when it's one of several translations */
  icon: string | null;
  /** The language has more than one translation in the song */
  duplicated: boolean;
}

export function translationNames(translations: { language: string; label?: string; sourceUrl?: string }[]): TranslationName[] {
  const counts: Record<string, number> = {};
  translations.forEach((t) => { counts[t.language] = (counts[t.language] ?? 0) + 1; });
  const seen: Record<string, number> = {};
  const used = new Set<string>();
  return translations.map((t) => {
    seen[t.language] = (seen[t.language] ?? 0) + 1;
    const n = seen[t.language];
    const key = n === 1 ? t.language : `${t.language} ${n}`;
    const duplicated = counts[t.language] > 1;
    const site = duplicated ? siteName(t.sourceUrl) : null;
    let name = t.label?.trim() || (site ? `${t.language} (${site})` : key);
    // Two from one site stay apart
    if (used.has(name)) name = `${name} ${n}`;
    used.add(name);
    return { key, name, language: t.language, duplicated, icon: duplicated ? getFaviconUrl(t.sourceUrl ?? '') : null };
  });
}

/** "Genius" for genius.com/..., "DeepL" for www.deepl.com/... */
export function siteName(url?: string): string | null {
  const host = url?.match(/^(?:https?:\/\/)?([^/?#:]+)/i)?.[1]?.toLowerCase();
  if (!host) return null;
  const parts = host.replace(/^www\./, '').split('.');
  const main = parts.length > 2 && parts[parts.length - 2].length <= 3 ? parts[parts.length - 3] : parts[parts.length - 2] ?? parts[0];
  return main ? main[0].toUpperCase() + main.slice(1) : null;
}

/** What an original version is called in the Editor and Learn Settings */
export function originalVersionName(version: { label?: string; sourceUrl?: string }, index: number): string {
  return version.label?.trim() || siteName(version.sourceUrl) || `Original ${index + 2}`;
}

/** The original Learn shows: the song's chosen extra, else the main one, and whether translations still line up with it */
export function learnOriginal(song: {
  originalLyrics: string;
  extraOriginals?: { id: string; label?: string; lyrics: string; sourceUrl?: string }[];
  learnOriginalId?: string;
}): { lyrics: string; aligned: boolean; extraIndex: number } {
  const extraIndex = song.extraOriginals?.findIndex((e) => e.id === song.learnOriginalId && e.lyrics.trim()) ?? -1;
  if (extraIndex < 0) return { lyrics: song.originalLyrics, aligned: true, extraIndex: -1 };
  const lyrics = song.extraOriginals![extraIndex].lyrics;
  return { lyrics, aligned: lyrics.split('\n').length === song.originalLyrics.split('\n').length, extraIndex };
}
