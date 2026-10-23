import { useEffect, useState } from 'react';
import { getWiktionaryAudio, type WiktionaryAudio } from '../utils/wiktionary';

/** Pronunciation recordings from the word's Wiktionary page in the language; empty until they load */
export function useWiktionaryAudio(word: string | undefined, language: string | undefined, enabled = true): WiktionaryAudio[] {
  const [audio, setAudio] = useState<WiktionaryAudio[]>([]);

  useEffect(() => {
    setAudio([]);
    if (!enabled || !word || !language) return;
    let cancelled = false;
    getWiktionaryAudio(word, language).then((result) => {
      if (!cancelled && result) setAudio(result);
    });
    return () => {
      cancelled = true;
    };
  }, [word, language, enabled]);

  return audio;
}
