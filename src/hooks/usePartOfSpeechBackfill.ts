import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { fillPartsOfSpeech } from '../utils/partOfSpeech';
import { getWiktionaryDefinitions } from '../utils/wiktionary';

// Definitions already looked up on Wiktionary, as "word id\u0000definition", so they're not again
const CHECKED_KEY = '@lyricsionary_part_of_speech_checked';
// Between Wiktionary requests, to stay well under its rate limits
const DELAY_MS = 1500;

const checkedKey = (id: string, definition: string) => `${id}\u0000${definition}`;

/**
 * Finds the word types of definitions saved before types were, a word at a time in the background,
 * so the word quiz can offer wrong answers of the same type
 */
export function usePartOfSpeechBackfill(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      let checked: Set<string>;
      try {
        checked = new Set(JSON.parse((await AsyncStorage.getItem(CHECKED_KEY)) ?? '[]'));
      } catch {
        checked = new Set();
      }
      const untyped = (contexts: { definition?: string; partOfSpeech?: string }[], id: string) =>
        contexts.filter((c) => c.definition?.trim() && !c.partOfSpeech && !checked.has(checkedKey(id, c.definition)));

      const todo = useStore.getState().words.filter((w) => untyped(w.contexts ?? [], w.id).length > 0);
      for (const { id } of todo) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        if (cancelled) return;
        // The word as it is now, in case it was edited or deleted meanwhile
        const entry = useStore.getState().words.find((w) => w.id === id);
        if (!entry) continue;
        const definitions = untyped(entry.contexts ?? [], id);
        if (definitions.length === 0) continue;
        const suggestions = await getWiktionaryDefinitions(entry.word, entry.language);
        // Offline or failed: try again next time the app starts
        if (cancelled || !suggestions) continue;
        const current = useStore.getState().words.find((w) => w.id === id);
        const filled = current && fillPartsOfSpeech(current.contexts ?? [], suggestions);
        if (filled) await useStore.getState().updateWordEntry(id, { contexts: filled });
        for (const c of definitions) checked.add(checkedKey(id, c.definition!));
        await AsyncStorage.setItem(CHECKED_KEY, JSON.stringify([...checked])).catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
