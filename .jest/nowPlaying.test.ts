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

  it('never picks Romanized', () => {
    expect(pickTranslationLanguage([{ translations: [{ language: 'Romanized' }] }], ['Japanese'])).toBe('English');
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

  it('ignores accents and the extras streaming apps add', () => {
    const saved = [
      { id: '2', songName: 'Corazón Partío', artistName: 'Alejandro Sanz' },
      { id: '3', songName: 'Papaoutai', artistName: 'Stromae & Orelsan' },
    ];
    expect(findSavedSong(saved, 'Corazon Partio - Remastered 2011', 'Alejandro Sanz')?.id).toBe('2');
    expect(findSavedSong(saved, 'Corazón Partío (Live)', 'alejandro sanz')?.id).toBe('2');
    expect(findSavedSong(saved, 'Papaoutai (feat. Orelsan)', 'Stromae, Orelsan')?.id).toBe('3');
    expect(findSavedSong(saved, 'Papaoutai', 'Orelsan')?.id).toBe('3');
    expect(findSavedSong(saved, 'Papaoutai', 'Someone Else')).toBeUndefined();
    expect(findSavedSong(saved, 'Corazón', 'Alejandro Sanz')).toBeUndefined();
  });
});
