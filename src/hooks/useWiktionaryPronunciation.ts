import { useEffect, useState } from 'react';
import { getWiktionaryPronunciation, type WiktionaryPronunciation } from '../utils/wiktionary';

const EMPTY: WiktionaryPronunciation = { ipa: [], audio: [] };

/** IPA and recordings from the word's Wiktionary page in the language; empty until they load */
export function useWiktionaryPronunciation(
  word: string | undefined,
  language: string | undefined,
  enabled = true
): WiktionaryPronunciation {
  const [pronunciation, setPronunciation] = useState(EMPTY);

  useEffect(() => {
    setPronunciation(EMPTY);
    if (!enabled || !word || !language) return;
    let cancelled = false;
    getWiktionaryPronunciation(word, language).then((result) => {
      if (!cancelled && result) setPronunciation(result);
    });
    return () => {
      cancelled = true;
    };
  }, [word, language, enabled]);

  return pronunciation;
}
