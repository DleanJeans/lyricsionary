// Supported lyrics sites to follow from Google results when Google has no lyrics panel
export const LYRICS_SITE_DOMAINS = ['genius.com', 'musixmatch.com', 'songlyrics.com', 'lyricsify.com', 'paroles-musique.com'];

/**
 * Pick the translation language for the automatic lyrics flow: the language
 * used most often in saved songs' translations, falling back to English.
 * Returns null when every candidate is one of the song's original languages.
 */
export function pickTranslationLanguage(
  songs: { translations: { language: string }[] }[],
  originalLanguages: string[]
): string | null {
  const counts: Record<string, number> = {};
  songs.forEach((s) => s.translations.forEach((t) => {
    counts[t.language] = (counts[t.language] ?? 0) + 1;
  }));
  const candidates = [...Object.keys(counts).sort((a, b) => counts[b] - counts[a]), 'English'];
  return candidates.find((lang) => !originalLanguages.includes(lang)) ?? null;
}

/**
 * Find a saved song matching the playing song (case-insensitive name and artist).
 */
export function findSavedSong<T extends { songName: string; artistName: string }>(
  songs: T[],
  songName: string,
  artistName: string
): T | undefined {
  const name = songName.trim().toLowerCase();
  const artist = artistName.trim().toLowerCase();
  return songs.find((s) => s.songName.trim().toLowerCase() === name && s.artistName.trim().toLowerCase() === artist);
}
