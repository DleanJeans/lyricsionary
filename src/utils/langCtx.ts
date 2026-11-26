import { isRtlLanguage } from '../constants/languages';
import type { WordEntry } from '../types';
import { isGermanLanguage } from './compoundWords';
import { getKoreanStem, isKoreanLanguage } from './koreanWords';
import { songWordIndex } from './lyricGaps';
import { getRomanceBaseWord } from './romanceClitics';
import { isStressLanguage } from './russianStress';
import { isSplitPhrase } from './splitPhrases';
import { spellingsOf } from './wordForms';
import { getGermanExpandedForm, hasHyphenatedPrefix, splitElisionParts } from './wordTransform';

/** What Learn looks up about a lyric word for one set of languages: a song's, or a line set to another language */
export type LangCtx = ReturnType<typeof buildLangCtx>;

export function buildLangCtx(words: WordEntry[], languages?: string[]) {
  const wordEntryIndex = songWordIndex(words, languages);
  // Saved phrases whose words sit apart in a line, e.g. hört … auf for aufhören
  const savedSplitPhrases = [...new Set(wordEntryIndex.values())].flatMap((entry) => spellingsOf(entry).filter(isSplitPhrase));
  const findWordEntry = (candidate: string) => wordEntryIndex.get(candidate.toLowerCase());
  const songLanguages = (languages ?? []).map((language) => language.toLowerCase());
  const hasFrenchLanguage = songLanguages.some((language) => language === 'french' || language === 'fr');
  const hasItalianLanguage = songLanguages.some((language) => language === 'italian' || language === 'it');
  const isGermanSong = isGermanLanguage(languages);
  const isKoreanSong = isKoreanLanguage(languages);
  const isStressSong = isStressLanguage(languages);
  // Arabic or Hebrew lyrics lay their words out from the right (I18nManager.isRTL is undefined on web)
  const isRtlSong = !!languages?.[0] && isRtlLanguage(languages[0]);
  // The saved word a lyric word stands for: itself, or else what its shortened form is about, e.g.
  // amour for l'amour, mélanger for mélan-mélanger, haben for hab'n
  const findSavedEntry = (cleanedWord: string): WordEntry | undefined => {
    const entry = findWordEntry(cleanedWord);
    if (entry) return entry;
    // A stuttered start, e.g. mélan-mélanger, but not a word joined to a pronoun like dis-moi
    if (hasFrenchLanguage && hasHyphenatedPrefix(cleanedWord)) {
      const hyphenIndex = cleanedWord.indexOf('-');
      const rest = cleanedWord.slice(hyphenIndex + 1);
      if (rest.toLowerCase().startsWith(cleanedWord.slice(0, hyphenIndex).toLowerCase())) {
        const withoutPrefix = findWordEntry(rest);
        if (withoutPrefix) return withoutPrefix;
      }
    }
    // (not for words written apart, or a saved ma' would pull the words after it into a phrase with it)
    if ((hasFrenchLanguage || hasItalianLanguage) && !/\s/.test(cleanedWord)) {
      // The last part with a saved word, e.g. aime in j't'aime
      const parts = splitElisionParts(cleanedWord) ?? [];
      const part = [...parts].reverse().map(findWordEntry).find(Boolean);
      if (part) return part;
    }
    // A Korean word without its particles, e.g. 너 for 너를
    const koreanStem = isKoreanSong ? getKoreanStem(cleanedWord, { loose: true }) : null;
    if (koreanStem) return findWordEntry(koreanStem);
    // A Spanish or Portuguese verb without its pronouns or a preposition without its article, e.g. di
    // for dímelo, amo for amo-te, de for del
    const romanceBase = getRomanceBaseWord(cleanedWord, languages, { loose: true, contractions: false });
    if (romanceBase) return findWordEntry(romanceBase);
    const expanded = isGermanSong ? getGermanExpandedForm(cleanedWord, 'German') : null;
    return expanded ? findWordEntry(expanded) : undefined;
  };
  // The parts of a French or Italian word shown split, e.g. j' and ai for j'ai, selectable on their own
  const elidedStartsOf = (cleaned: string) =>
    (hasFrenchLanguage || hasItalianLanguage) && !/\s/.test(cleaned) && !findWordEntry(cleaned)
      ? (splitElisionParts(cleaned) ?? [])
      : [];
  return {
    languages, wordEntryIndex, savedSplitPhrases, findWordEntry, findSavedEntry, elidedStartsOf,
    hasFrenchLanguage, hasItalianLanguage, isGermanSong, isKoreanSong, isStressSong, isRtlSong,
  };
}
