import { useStore } from '../src/store/useStore';
import { flushWrites } from '../src/services/storageWrites';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
let n = 0;
// uuid ships ES modules only, which Jest doesn't transform
jest.mock('uuid', () => ({ v4: () => `id${++n}` }));

const saved = (id: string, word: string, masteryLevel: 'Seen' | 'Known' = 'Seen') => ({
  id, word, language: 'de', pronunciation: '', contexts: [], lastLookedUp: 0, masteryLevel,
});

describe('picked words in Learn', () => {
  beforeEach(() => {
    useStore.setState({ words: [saved('a', 'Haus'), saved('b', 'kalt', 'Known')], ignoredWords: [{ word: 'rot', language: 'de' }], activity: {} });
  });

  it('sets a level on many words with one change', async () => {
    const changes: unknown[] = [];
    const unsubscribe = useStore.subscribe((s) => changes.push(s));
    const done = useStore.getState().setPickedWordsLevel([
      { word: 'Haus', savedId: 'a', context: { context: 'x' } },
      { word: 'kalt', savedId: 'b', context: { context: 'x' } },
      { word: 'rot', context: { context: 'rot und blau', songId: 's' } },
      { word: 'blau', pronunciation: '/blaʊ/', context: { context: 'rot und blau', songId: 's' } },
    ], 'de', 'Recalled');
    expect(changes).toHaveLength(1);
    unsubscribe();
    const { words, ignoredWords, activity } = useStore.getState();
    expect(words.map((w) => [w.word, w.masteryLevel])).toEqual([['Haus', 'Recalled'], ['kalt', 'Recalled'], ['rot', 'Recalled'], ['blau', 'Recalled']]);
    expect(words[3].pronunciation).toBe('/blaʊ/');
    expect(words[3].contexts[0].context).toBe('rot und blau');
    expect(ignoredWords).toEqual([]);
    expect(Object.values(activity)[0]).toMatchObject({ saved: 2 });
    await flushWrites();
    await done;
    expect(JSON.parse((await AsyncStorage.getItem('@lyricsionary_words'))!)).toHaveLength(4);
    expect(JSON.parse((await AsyncStorage.getItem('@lyricsionary_ignored_words'))!)).toEqual([]);
  });

  it('ignores many words with one change, once each', async () => {
    const changes: unknown[] = [];
    const unsubscribe = useStore.subscribe((s) => changes.push(s));
    const done = useStore.getState().ignoreWords(['Blau', 'grün', 'ROT', 'blau'], 'de');
    expect(changes).toHaveLength(1);
    unsubscribe();
    expect(useStore.getState().ignoredWords).toEqual([
      { word: 'rot', language: 'de' }, { word: 'blau', language: 'de' }, { word: 'grün', language: 'de' },
    ]);
    await flushWrites();
    await done;
    expect(JSON.parse((await AsyncStorage.getItem('@lyricsionary_ignored_words'))!)).toHaveLength(3);
  });
});
