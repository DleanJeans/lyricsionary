/**
 * Cleans lyrics scraped from Genius by removing unwanted formatting elements
 *
 * Removes:
 * 1. First block containing "Translations", song title, and language-specific headers (e.g., [Paroles de "..."])
 * 2. Section tags like [Intro], [Refrain], [Couplet 1], [Outro], etc.
 * 3. Multiple consecutive empty lines (consolidates to single empty line)
 */
export function cleanGeniusLyrics(lyrics: string): string {
  if (!lyrics) return lyrics;

  let cleaned = lyrics;

  // Remove first block containing translations header and song title
  // This typically looks like:
  // Translations
  // Menteuse Lyrics
  // [Paroles de "Menteuse"]
  // or similar patterns in different languages

  // Pattern matches:
  // - Optional "Translations" line
  // - Optional song title with "Lyrics"
  // - Optional language-specific header like [Paroles de "..."], [Letra de "..."], etc.
  // We'll remove everything up to and including the first bracketed header that contains language indicators
  const firstBlockPattern = /^[\s\S]*?\[(?:Paroles|Letra|Testo|歌詞|가사)[^\]]*\]\s*/i;
  cleaned = cleaned.replace(firstBlockPattern, '');

  // If the first block pattern didn't match, try removing just "Translations" and title lines
  // Look for pattern: optional "Translations", followed by something with "Lyrics"
  if (cleaned === lyrics) {
    const simplifiedPattern = /^(?:Translations\s+)?.*?\s*Lyrics\s*\n/i;
    cleaned = cleaned.replace(simplifiedPattern, '');
  }

  // Remove section tags like [Intro], [Refrain], [Couplet 1], [Verse 2], [Chorus], [Outro], etc.
  // This pattern matches:
  // - Opening bracket [
  // - Any text (tag name and optional number/descriptor)
  // - Closing bracket ]
  // - Optional trailing whitespace
  // Common tags include: Intro, Verse, Chorus, Bridge, Outro, Refrain, Couplet, Pre-Chorus, Hook, Point, etc.
  cleaned = cleaned.replace(/^\s*\[([^\]]+)\]\s*$/gm, '');

  // Consolidate multiple consecutive empty lines to a single empty line
  // This pattern matches 2 or more consecutive newlines and replaces with exactly 2 (which is one empty line)
  cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n');

  // Trim leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}
