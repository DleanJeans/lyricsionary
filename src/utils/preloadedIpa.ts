import AsyncStorage from '@react-native-async-storage/async-storage';
import { languageKey } from '../constants/languages';
import { persist } from '../services/storageWrites';
import { seedWiktionaryDefinitions, type WiktionaryDefinition } from './wiktionary';

const STORAGE_KEY = '@lyricsionary_preloaded_ipa';
// Oldest lookups go first when the cache grows past this
const MAX_ENTRIES = 6000;

/**
 * IPA and meanings looked up from Wiktionary for words not saved yet, by song language and word, as Learn
 * preloads them. A word Wiktionary has nothing for is kept empty, asked again only after a restart; only
 * words with an IPA or a meaning are kept across restarts.
 */
export interface PreloadedWord {
  ipa: string;
  /** The meaning matching the line's translation where it was found, else the first meaning */
  definition?: string;
  partOfSpeech?: string;
  /** All the meanings Wiktionary gave, so tapping the word needn't ask again */
  definitions?: WiktionaryDefinition[];
  /** The song language the word was found in, e.g. French in a German and French song */
  language?: string;
}
const cache = new Map<string, PreloadedWord>();
let loading: Promise<void> | undefined;

export const preloadedIpaKey = (language: string | undefined, word: string) => `${languageKey(language ?? '')}\u0000${word}`;

/** Reads the cache saved by earlier sessions, once */
export function loadPreloadedIpa(): Promise<void> {
  loading ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((json) => {
      if (!json) return;
      const saved: unknown = JSON.parse(json);
      if (!Array.isArray(saved)) return;
      for (const entry of saved) {
        const value = Array.isArray(entry) ? (entry[1] as Partial<PreloadedWord> | undefined) : undefined;
        if (typeof entry?.[0] === 'string' && typeof value?.ipa === 'string' && !cache.has(entry[0])) {
          if (Array.isArray(value.definitions) && value.language) seedWiktionaryDefinitions(entry[0].split('\u0000')[1] ?? '', value.language, value.definitions);
          cache.set(entry[0], { ipa: value.ipa, definition: value.definition, partOfSpeech: value.partOfSpeech, language: value.language, definitions: Array.isArray(value.definitions) ? value.definitions : undefined });
        }
      }
    })
    .catch((e) => console.warn('Failed to load preloaded IPA', e));
  return loading;
}

export const getPreloadedWord = (language: string | undefined, word: string): PreloadedWord | undefined => {
  const found = cache.get(preloadedIpaKey(language, word));
  return found && (found.ipa || found.definition) ? found : undefined;
};

export const getPreloadedIpa = (language: string | undefined, word: string): string | undefined =>
  getPreloadedWord(language, word)?.ipa || undefined;

export const hasPreloadedIpa = (key: string): boolean => cache.has(key);

/** Remembers a lookup, saving the ones with something found a moment later */
export function setPreloadedWord(key: string, word: PreloadedWord): void {
  cache.delete(key);
  cache.set(key, word);
  if (!word.ipa && !word.definition) return;
  void persist(STORAGE_KEY, () => JSON.stringify([...cache].filter(([, value]) => value.ipa || value.definition).slice(-MAX_ENTRIES)));
}
