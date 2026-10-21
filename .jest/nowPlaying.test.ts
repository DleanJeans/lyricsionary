import { findSavedSong, pickTranslationLanguage } from '../src/utils/nowPlaying';

describe('pickTranslationLanguage', () => {
  const songs = [
    { translations: [{ language: 'Vietnamese' }, { language: 'English' }] },
    { translations: [{ language: 'Vietnamese' }] },
  ];

  it('picks the most used translation language', () => {
    expect(pickTranslationLanguage(songs, ['German'])).toBe('Vietnamese');
  });

  it('skips languages the song is already in', () => {
    expect(pickTranslationLanguage(songs, ['Vietnamese'])).toBe('English');
  });

  it('falls back to English with no saved translations', () => {
    expect(pickTranslationLanguage([], ['French'])).toBe('English');
  });

  it('returns null when no language is left', () => {
    expect(pickTranslationLanguage([], ['English'])).toBeNull();
  });
});

describe('findSavedSong', () => {
  const songs = [{ id: '1', songName: 'Menteuse ', artistName: 'Lorenzo' }];

  it('matches case-insensitively', () => {
    expect(findSavedSong(songs, 'menteuse', 'LORENZO')?.id).toBe('1');
  });

  it('requires the artist to match', () => {
    expect(findSavedSong(songs, 'Menteuse', 'Other')).toBeUndefined();
  });
});
