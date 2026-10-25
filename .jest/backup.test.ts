import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBackup, parseBackup, restoreBackup, summarizeBackup } from '../src/services/backup';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('Backup', () => {
  beforeEach(() => AsyncStorage.clear());

  it('exports saved data but not what this phone last played', async () => {
    await AsyncStorage.multiSet([
      ['@lyricsionary_songs', '[{"id":"a"},{"id":"b"}]'],
      ['@lyricsionary_words', '[{"id":"w"}]'],
      ['@lyricsionary_songs_sort', '"title"'],
      ['@lyricsionary_last_media', '{"title":"x"}'],
      ['other_library_key', '1'],
    ]);

    const backup = await createBackup('Lyricsionary');

    expect(Object.keys(backup.data).sort()).toEqual([
      '@lyricsionary_songs',
      '@lyricsionary_songs_sort',
      '@lyricsionary_words',
    ]);
    expect(summarizeBackup(backup)).toEqual({ songs: 2, words: 1 });
  });

  it('replaces the data on import and keeps the device-only keys', async () => {
    await AsyncStorage.multiSet([
      ['@lyricsionary_songs', '[{"id":"prod"}]'],
      ['@lyricsionary_words', '[]'],
    ]);
    const backup = parseBackup(JSON.stringify(await createBackup('Lyricsionary')));

    await AsyncStorage.clear();
    await AsyncStorage.multiSet([
      ['@lyricsionary_songs', '[{"id":"dev"}]'],
      ['@lyricsionary_ignored_words', '[{"word":"la","language":"fr"}]'],
      ['@lyricsionary_last_media', '{"title":"x"}'],
    ]);
    await restoreBackup(backup);

    expect(await AsyncStorage.getItem('@lyricsionary_songs')).toBe('[{"id":"prod"}]');
    expect(await AsyncStorage.getItem('@lyricsionary_words')).toBe('[]');
    expect(await AsyncStorage.getItem('@lyricsionary_ignored_words')).toBeNull();
    expect(await AsyncStorage.getItem('@lyricsionary_last_media')).toBe('{"title":"x"}');
  });

  it('rejects text that is not a backup', () => {
    expect(() => parseBackup('hello')).toThrow("This isn't a Lyricsionary backup.");
    expect(() => parseBackup('{"songs":[]}')).toThrow("This isn't a Lyricsionary backup.");
    expect(() => parseBackup('{"format":"lyricsionary-backup","version":2,"data":{}}')).toThrow(/newer version/);
  });

  it('drops keys a backup should not set', () => {
    const backup = parseBackup(
      JSON.stringify({
        format: 'lyricsionary-backup',
        version: 1,
        data: { '@lyricsionary_words': '[]', '@lyricsionary_last_media': '{}', other: 'x' },
      })
    );
    expect(backup.data).toEqual({ '@lyricsionary_words': '[]' });
  });
});
