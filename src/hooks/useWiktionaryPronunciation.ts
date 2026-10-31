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
  /** True while the page is being fetched */
  pending: boolean;
}

const EMPTY: WiktionaryPronunciation = { ipa: [], audio: [] };

/** IPA and recordings from the word's Wiktionary page in the language; empty until they load */
export function useWiktionaryPronunciation(
  word: string | undefined,
  language: string | undefined,
  { enabled = true, savedAudio, needsIpa = true }: Options = {}
): Result {
  const [pronunciation, setPronunciation] = useState<WiktionaryPronunciation | null>(null);
  const [settled, setSettled] = useState(false);
  const skip = !!savedAudio && !needsIpa;
  const fetches = enabled && !skip && !!word && !!language;

  useEffect(() => {
    setPronunciation(null);
    setSettled(false);
    if (!fetches) return;
    let cancelled = false;
    getWiktionaryPronunciation(word, language).then((result) => {
      if (cancelled) return;
      setPronunciation(result ?? null);
      setSettled(true);
    });
    return () => {
      cancelled = true;
    };
  }, [word, language, fetches]);

  const pending = fetches && !settled;
  if (savedAudio) return { ipa: pronunciation?.ipa ?? [], audio: savedAudio, loaded: true, pending };
  return { ...(pronunciation ?? EMPTY), loaded: pronunciation !== null, pending };
}
