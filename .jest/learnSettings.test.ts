import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '../src/store/useStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
// uuid ships ES modules only, which Jest doesn't transform
jest.mock('uuid', () => ({ v4: () => 'id' }));

const KEY = '@lyricsionary_learn_settings';
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Learn settings', () => {
  beforeEach(() => AsyncStorage.clear());

  it('saves changes and loads them back after a restart', async () => {
    const store = useStore.getState();
    store.setFontSize(22);
    store.toggleBlurTranslations();
    store.setShowIpa(false);
    store.toggleShowSections();
    await flush();

    expect(JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}')).toEqual({
      fontSize: 22,
      blurTranslations: false,
      showMasteryLevelColors: true,
      showIpa: false,
      showIpaBrackets: true,
      showEmoji: true,
      showSections: false,
    });

    useStore.setState({ fontSize: 18, blurTranslations: true, showIpa: true, showSections: true });
    await useStore.getState().loadLearnSettings();
    expect(useStore.getState()).toMatchObject({ fontSize: 22, blurTranslations: false, showIpa: false, showSections: false });
  });

  it('keeps defaults for missing or malformed values', async () => {
    useStore.setState({ fontSize: 18, showEmoji: true, showTranslations: true });
    await AsyncStorage.setItem(KEY, JSON.stringify({ fontSize: 'big', showEmoji: false }));
    await useStore.getState().loadLearnSettings();
    expect(useStore.getState()).toMatchObject({ fontSize: 18, showEmoji: false, showTranslations: true });
  });
});
