import { useEffect, useState } from 'react';
import { getWiktionaryPronunciation, type WiktionaryAudio, type WiktionaryPronunciation } from '../utils/wiktionary';

interface Options {
  enabled?: boolean;
  /** Recordings a saved word already has; the page is skipped unless its IPA is needed too */
  savedAudio?: WiktionaryAudio[];
  needsIpa?: boolean;
}

interface Result extends WiktionaryPronunciation {
  /** False until the page loads (or fails), so an empty audio list isn't mistaken for "none" */
  loaded: boolean;
}

const EMPTY: WiktionaryPronunciation = { ipa: [], audio: [] };

/** IPA and recordings from the word's Wiktionary page in the language; empty until they load */
export function useWiktionaryPronunciation(
  word: string | undefined,
  language: string | undefined,
  { enabled = true, savedAudio, needsIpa = true }: Options = {}
): Result {
  const [pronunciation, setPronunciation] = useState<WiktionaryPronunciation | null>(null);
  const skip = !!savedAudio && !needsIpa;

  useEffect(() => {
    setPronunciation(null);
    if (!enabled || skip || !word || !language) return;
    let cancelled = false;
    getWiktionaryPronunciation(word, language).then((result) => {
      if (!cancelled) setPronunciation(result ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [word, language, enabled, skip]);

  if (savedAudio) return { ipa: pronunciation?.ipa ?? [], audio: savedAudio, loaded: true };
  return { ...(pronunciation ?? EMPTY), loaded: pronunciation !== null };
}
