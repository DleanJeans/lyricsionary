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

// A title without accents and the extras streaming apps add, e.g. "corazon partio" for
// "Corazón Partío - Remastered 2011" or "Menteuse (feat. X)"
function normalizeTitle(title: string): string {
  return fold(title)
    .replace(/\s+-\s+.*$/, '')
    .replace(/\s*[([](?:feat\.?|ft\.?|with|from|remaster|live|version|radio edit|acoustic)[^)\]]*[)\]]/gi, '')
    .replace(/\s*[([][^)\]]*\b(?:remaster(?:ed)?|version|edit|mix)\b[^)\]]*[)\]]/gi, '')
    .trim();
}

// Each artist credited, without accents, e.g. ["stromae", "orelsan"] for "Stromae, Orelsan" or "Stromae & Orelsan"
function artistsOf(artist: string): string[] {
  return fold(artist)
    .split(/\s*(?:,|&|\band\b|\bfeat\.?|\bft\.?|\bx\b|\/)\s*/)
    .map((a) => a.trim())
    .filter(Boolean);
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/**
 * Find a saved song matching the playing song: the same name and artist ignoring case, or else
 * ignoring accents and extras like "- Remastered" or "(feat. ...)" with at least one artist in common.
 */
export function findSavedSong<T extends { songName: string; artistName: string }>(
  songs: T[],
  songName: string,
  artistName: string
): T | undefined {
  const name = songName.trim().toLowerCase();
  const artist = artistName.trim().toLowerCase();
  const exact = songs.find((s) => s.songName.trim().toLowerCase() === name && s.artistName.trim().toLowerCase() === artist);
  if (exact) return exact;

  const title = normalizeTitle(songName);
  const artists = artistsOf(artistName);
  if (!title || artists.length === 0) return undefined;
  return songs.find(
    (s) => normalizeTitle(s.songName) === title && artistsOf(s.artistName).some((a) => artists.includes(a))
  );
}
