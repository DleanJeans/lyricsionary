import { LANGUAGES } from '../constants/languages';

// The native module only exists in an APK built with expo-speech-recognition, so an app updated over
// the air onto an older APK has to cope without it
declare const require: (id: string) => any;
let Module: any = null;
try {
  Module = require('expo-speech-recognition').ExpoSpeechRecognitionModule ?? null;
} catch {
  Module = null;
}

/** Whether this build has speech recognition at all (an old APK doesn't) */
export const hasSpeechModule = () => !!Module && typeof Module.start === 'function';

/** The recognizer's locale for a saved word's language, given as a name or a code */
export function speechLocale(language: string): string {
  const lower = language.toLowerCase();
  const found = LANGUAGES.find((l) => l.code === lower || l.name.toLowerCase() === lower) ?? LANGUAGES.find((l) => l.code === lower.split(/[-_]/)[0]);
  const code = found?.code ?? lower;
  return code === 'zh' ? 'zh-CN' : code === 'yue' ? 'yue-HK' : code;
}

export type ListenOutcome =
  | { type: 'heard'; alternatives: string[] }
  | { type: 'nothing' }
  | { type: 'denied' }
  | { type: 'unavailable' };

/**
 * Listens once for the word to be said and calls back with what was heard, or why it wasn't. Returns
 * a function that stops listening.
 */
export function listenForWord(language: string, word: string, onDone: (outcome: ListenOutcome) => void): () => void {
  if (!hasSpeechModule()) {
    onDone({ type: 'unavailable' });
    return () => {};
  }
  let finished = false;
  let heard: string[] = [];
  const subs: { remove: () => void }[] = [];
  const finish = (outcome: ListenOutcome) => {
    if (finished) return;
    finished = true;
    subs.forEach((s) => s.remove());
    onDone(outcome);
  };
  void (async () => {
    try {
      if (!Module.isRecognitionAvailable?.()) return finish({ type: 'unavailable' });
      const permission = await Module.requestPermissionsAsync();
      if (!permission.granted) return finish({ type: 'denied' });
      subs.push(
        Module.addListener('result', (event: any) => {
          const alternatives: string[] = (event?.results ?? []).map((r: any) => r?.transcript).filter(Boolean);
          if (alternatives.length) heard = alternatives;
        }),
        Module.addListener('error', (event: any) => {
          if (event?.error === 'not-allowed') finish({ type: 'denied' });
          else if (event?.error === 'no-speech' || event?.error === 'speech-timeout' || event?.error === 'aborted') finish({ type: 'nothing' });
          else if (heard.length) finish({ type: 'heard', alternatives: heard });
          else finish({ type: event?.error === 'language-not-supported' || event?.error === 'service-not-allowed' ? 'unavailable' : 'nothing' });
        }),
        Module.addListener('end', () => finish(heard.length ? { type: 'heard', alternatives: heard } : { type: 'nothing' }))
      );
      Module.start({ lang: speechLocale(language), interimResults: false, maxAlternatives: 10, contextualStrings: [word], continuous: false });
    } catch {
      finish({ type: 'unavailable' });
    }
  })();
  return () => {
    if (finished) return;
    try {
      Module?.abort?.();
    } catch {
      // Already stopped
    }
    finish({ type: 'nothing' });
  };
}
