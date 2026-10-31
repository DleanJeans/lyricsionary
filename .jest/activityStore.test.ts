import { useStore } from '../src/store/useStore';
import { localDay } from '../src/utils/wordQuiz';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
// uuid ships ES modules only, which Jest doesn't transform
jest.mock('uuid', () => ({ v4: () => 'id' }));

describe('activity in the store', () => {
  beforeEach(() => useStore.setState({ words: [], activity: {} }));
  const today = () => useStore.getState().activity[localDay(Date.now())] ?? {};

  it('takes back a word saved and deleted the same day, and counts it again on undo', async () => {
    await useStore.getState().addOrUpdateWord('amour', 'French');
    expect(today().saved).toBe(1);
    const entry = useStore.getState().words[0];
    await useStore.getState().deleteWord(entry.id);
    expect(today().saved).toBe(0);
    await useStore.getState().restoreWord(entry);
    expect(today().saved).toBe(1);
  });

  it('keeps the count for a word saved on another day', async () => {
    useStore.setState({ words: [{ id: 'old', word: 'joie', language: 'French', pronunciation: '', contexts: [], lastLookedUp: 0, savedAt: 0 }] });
    await useStore.getState().deleteWord('old');
    expect(today().saved).toBeUndefined();
  });
});
