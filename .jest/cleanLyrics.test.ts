import { cleanGeniusLyrics } from '../src/utils/cleanLyrics';

describe('cleanGeniusLyrics', () => {
  it('removes the translations header, section tags and extra blank lines', () => {
    const lyrics = 'Translations\nMenteuse Lyrics\n[Paroles de "Menteuse"]\n\n[Couplet 1]\nTu mens\n\n\n\n[Refrain]\nOui';
    expect(cleanGeniusLyrics(lyrics)).toBe('Tu mens\n\nOui');
  });

  it('removes a title line ending in Lyrics', () => {
    expect(cleanGeniusLyrics('Song Lyrics\n[Verse 1]\nHello [softly]\nWorld')).toBe('Hello [softly]\nWorld');
  });

  it('keeps a first lyric line that ends in "lyrics"', () => {
    expect(cleanGeniusLyrics('Everyone sings these lyrics\nAnd more')).toBe('Everyone sings these lyrics\nAnd more');
  });
});
