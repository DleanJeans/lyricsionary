import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ActivityIndicator, I18nManager, LayoutChangeEvent, StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from '../components/Toast';
import LineActionSheet from '../components/LineActionSheet';
import LearnActionBar from '../components/LearnActionBar';
import { useNextLineToLearn, useWordProgress } from '../hooks/useWordProgress';
import LearnLyricsView, { type LearnLine } from '../components/LearnLyricsView';
import LearnSettingsMenu from '../components/LearnSettingsMenu';
import EmptyState from '../components/EmptyState';
import NewWordCard from '../components/NewWordCard';
import WordTransformButtons from '../components/WordTransformButtons';
import ScreenWrapper from '../components/ScreenWrapper';
import SongMetadataHeader from '../components/SongMetadataHeader';
import { Text } from '../components/Text';
import WordCard from '../components/WordCard';
import FoldAway, { useSwipe } from '../components/FoldAway';
import WordQuiz from '../components/WordQuiz';
import { getFlagForLanguage, isRomanized, isRtlLanguage, isSameLanguage } from '../constants/languages';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { findWordIndex, type WordRect } from '../components/SelectableTranslation';
import { useBackToQuit } from '../hooks/useBackToQuit';
import { useIsWide } from '../hooks/useLayout';
import { isWordIgnored, makeIgnoredWordChecker, useStore } from '../store/useStore';
import { contextTranslation } from '../utils/wordOfTheDay';
import { RootTabParamList, WordContext, WordEntry } from '../types';
import { cleanLyricWord, isLyricWord, isTappableLyric, removeSpecialChars, splitEdgePunctuation, splitLyricTokens } from '../utils/cleanLyrics';
import { findDefinitionHighlight, pickDefinition, withWordForms } from '../utils/definitionHighlight';
import { formatSongSections } from '../utils/songSections';
import { formatIpa } from '../utils/ipaDisplay';
import { meaningAbove } from '../utils/meaningDisplay';
import { buildKnownGermanWords, getCompoundParts, isGermanLanguage, joinCompoundIpa } from '../utils/compoundWords';
import { canFillGaps, gapWord, songWordIndex } from '../utils/lyricGaps';
import { draggedPhrase, groupCjkTokens, groupSpacedWords, isCjkWord } from '../utils/cjkWords';
import { getKoreanStem, isKoreanLanguage } from '../utils/koreanWords';
import { getRomanceBaseWord } from '../utils/romanceClitics';
import { addStressMark, isStressLanguage, removeStressMarks } from '../utils/russianStress';
import { romanizeLine } from '../utils/romanize';
import { buildLyricQuiz, buildMeaningQuiz, isTricky, quizKindFor } from '../utils/wordQuiz';
import { buildSongReview, lineWords, SONG_REVIEW_SIZE, songDueWords, type ReviewItem } from '../utils/reviewQuiz';
import ReviewSession from '../components/ReviewSession';
import LineDrill from '../components/LineDrill';
import LineQuizMode from '../components/LineQuizMode';
import SpotifyBar from '../components/SpotifyBar';
import { usePersistedState } from '../hooks/usePersistedState';
import { useSpotifyLyricsSync } from '../hooks/useSpotifyLyricsSync';
import { normalizePartOfSpeech, type PartOfSpeech } from '../utils/partOfSpeech';
import { clippedFormIpa, getWiktionaryDefinitions, getWiktionaryPronunciation, peekWiktionaryDefinitions } from '../utils/wiktionary';
import { germanFullForms, getGermanExpandedForm, hasContractedPrefix, hasHyphenatedPrefix, splitElisionParts } from '../utils/wordTransform';
import { findWordSpots, stepWordSpot } from '../utils/wordLines';
import WordSpotStepper from '../components/WordSpotStepper';
import LemmaMergeHint from '../components/LemmaMergeHint';
import WordSheet from '../components/WordSheet';
import Dictation from '../components/Dictation';
import SplitPhraseHint from '../components/SplitPhraseHint';
import { findSavedWord, formIpa, spellingsOf } from '../utils/wordForms';
import { firstIpa } from '../utils/ipaList';
import { getFaviconUrl } from '../utils/getFaviconUrl';
import { learnOriginal, originalVersionName, translationNames } from '../utils/translationNames';
import { hasPreloadedIpa, loadPreloadedIpa, preloadedIpaKey as preloadKey, getPreloadedIpa, getPreloadedWord, setPreloadedWord, type PreloadedWord } from '../utils/preloadedIpa';
import {
  findSplitPhrases, germanSeparableVerb, isSplitPhrase, joinLineWords, phraseLookupWords, phraseOccurrenceAt, splitPhraseParts,
} from '../utils/splitPhrases';

const PREVIEW_MAX_WORDS = 8;
// Words looked up together while preloading, and the delay before the next one starts, so each one's spinner pops up in turn and Wiktionary isn't hammered
const PRELOAD_BATCH = 5;
const PRELOAD_STAGGER_MS = 150;

export default function LearnScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootTabParamList, 'Learn'>>();
  const isWide = useIsWide();
  useBackToQuit();
  const songs = useStore((s) => s.songs);
  const words = useStore((s) => s.words);
  const updateSong = useStore((s) => s.updateSong);
  const addOrUpdateWord = useStore((s) => s.addOrUpdateWord);
  const deleteWord = useStore((s) => s.deleteWord);
  const setWordsLevel = useStore((s) => s.setWordsLevel);
  const restoreWord = useStore((s) => s.restoreWord);
  const ignoredWords = useStore((s) => s.ignoredWords);
  const toggleIgnoredWord = useStore((s) => s.toggleIgnoredWord);
  const compoundSplits = useStore((s) => s.compoundSplits);
  const currentSongId = useStore((s) => s.currentSongId);
  const storedFontSize = useStore((s) => s.fontSize);
  // Line by line: one line at a time in bigger text, with the index of the line shown
  const [lineByLine, setLineByLine] = useState<number | null>(null);
  const fontSize = lineByLine !== null ? Math.min(storedFontSize + 8, 40) : storedFontSize;
  const setFontSize = useStore((s) => s.setFontSize);
  const showTranslations = useStore((s) => s.showTranslations);
  const toggleTranslations = useStore((s) => s.toggleTranslations);
  const setSelectedTranslationLanguages = useStore((s) => s.setSelectedTranslationLanguages);
  const blurTranslations = useStore((s) => s.blurTranslations);
  const toggleBlurTranslations = useStore((s) => s.toggleBlurTranslations);
  const reverseLyrics = useStore((s) => s.reverseLyrics);
  const toggleReverseLyrics = useStore((s) => s.toggleReverseLyrics);
  // Reverse mode: the original lines tapped to show
  const [revealedOriginals, setRevealedOriginals] = useState<Set<number>>(new Set());
  const showMasteryLevelColors = useStore((s) => s.showMasteryLevelColors);
  const toggleShowMasteryLevelColors = useStore((s) => s.toggleShowMasteryLevelColors);
  const showIpa = useStore((s) => s.showIpa);
  const setShowIpa = useStore((s) => s.setShowIpa);
  const showIpaBrackets = useStore((s) => s.showIpaBrackets);
  const toggleShowIpaBrackets = useStore((s) => s.toggleShowIpaBrackets);
  const showEmoji = useStore((s) => s.showEmoji);
  const setShowEmoji = useStore((s) => s.setShowEmoji);
  const showMeaning = useStore((s) => s.showMeaning);
  const setShowMeaning = useStore((s) => s.setShowMeaning);
  const showSections = useStore((s) => s.showSections);
  const toggleShowSections = useStore((s) => s.toggleShowSections);
  const isLoadingSong = useStore((s) => s.isLoadingSong);
  const setIsLoadingSong = useStore((s) => s.setIsLoadingSong);

  const activeSongId = route.params?.songId ?? currentSongId;
  const song = songs.find((s) => s.id === activeSongId);
  const isGermanSong = isGermanLanguage(song?.originalLanguages);
  const knownGermanWords = useMemo(() => buildKnownGermanWords(words), [words]);
  const isIgnoredWord = useMemo(() => makeIgnoredWordChecker(ignoredWords), [ignoredWords]);
  const wordEntryIndex = useMemo(() => songWordIndex(words, song?.originalLanguages), [song?.originalLanguages, words]);
  // Saved phrases whose words sit apart in a line, e.g. hört … auf for aufhören
  const savedSplitPhrases = useMemo(
    () => [...new Set(wordEntryIndex.values())].flatMap((entry) => spellingsOf(entry).filter(isSplitPhrase)),
    [wordEntryIndex]
  );
  const findWordEntry = useCallback(
    (candidate: string) => wordEntryIndex.get(candidate.toLowerCase()),
    [wordEntryIndex]
  );
  const songLanguages = (song?.originalLanguages ?? []).map((language) => language.toLowerCase());
  const hasFrenchLanguage = songLanguages.some((language) => language === 'french' || language === 'fr');
  const hasItalianLanguage = songLanguages.some((language) => language === 'italian' || language === 'it');
  const isKoreanSong = isKoreanLanguage(song?.originalLanguages);
  const isStressSong = isStressLanguage(song?.originalLanguages);
  // Arabic or Hebrew lyrics lay their words out from the right (I18nManager.isRTL is undefined on web)
  const isRtlSong = !!song?.originalLanguages?.[0] && isRtlLanguage(song.originalLanguages[0]);
  // The saved word a lyric word stands for: itself, or else what its shortened form is about, e.g.
  // amour for l'amour, mélanger for mélan-mélanger, haben for hab'n
  const findSavedEntry = useCallback(
    (cleanedWord: string) => {
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
      const romanceBase = getRomanceBaseWord(cleanedWord, song?.originalLanguages, { loose: true });
      if (romanceBase) return findWordEntry(romanceBase);
      const expanded = isGermanSong ? getGermanExpandedForm(cleanedWord, 'German') : null;
      return expanded ? findWordEntry(expanded) : undefined;
    },
    [findWordEntry, hasFrenchLanguage, hasItalianLanguage, isGermanSong, isKoreanSong, song?.originalLanguages]
  );
  // The elided starts of a French or Italian word shown split, e.g. j' for j'ai, selectable on their own
  const elidedStartsOf = useCallback(
    (cleaned: string) =>
      (hasFrenchLanguage || hasItalianLanguage) && !/\s/.test(cleaned) && !findWordEntry(cleaned)
        ? (splitElisionParts(cleaned) ?? []).slice(0, -1)
        : [],
    [findWordEntry, hasFrenchLanguage, hasItalianLanguage]
  );
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  // The selected word as of the last render, for a word's Wiktionary fetch to tell it's been tapped away from
  const selectedWordRef = useRef(selectedWord);
  selectedWordRef.current = selectedWord;
  // Tapped words whose IPA and meanings are still loading from Wiktionary, as line:occurrence:word,
  // which keep loading after another word is tapped and show a spinner where their IPA goes
  const [loadingWords, setLoadingWords] = useState<ReadonlySet<string>>(() => new Set());
  const loadingWordKey = (word: string, lineIndex: number | null, occurrence: number) =>
    `${lineIndex}:${occurrence}:${word.toLowerCase()}`;
  // The selected word's fetch, which growing a Chinese or Japanese word from it stops
  const wordFetchRef = useRef<{ word: string; cancelled: boolean } | null>(null);
  // The X on the word card folds it away first on narrow screens, then clears the word
  const [closingWordCard, setClosingWordCard] = useState(false);
  // How much of the lyrics the word sheet covers on a phone
  const [sheetHeight, setSheetHeight] = useState(0);
  // A new word (or none) stops the folding, so tapping another word mid-close opens the card back up
  useEffect(() => setClosingWordCard(false), [selectedWord]);
  const closeWordCard = useCallback(() => (isWide ? setSelectedWord(null) : setClosingWordCard(true)), [isWide]);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [selectedOccurrence, setSelectedOccurrence] = useState<number>(1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [localSelectedLanguages, setLocalSelectedLanguages] = useState<string[]>([]);
  const [unblurredTranslations, setUnblurredTranslations] = useState<Set<string>>(new Set());
  // Lines whose translation was shown since the song opened, even if blurred again, so the word
  // quiz isn't asked there; all of them once translations were shown unblurred
  const [seenTranslationLines, setSeenTranslationLines] = useState<Set<number>>(new Set());
  const [seenAllTranslations, setSeenAllTranslations] = useState(false);
  // Fill in the lyrics: saved words to recall show as gaps until answered
  // Fill in the lyrics, opened from a song's pencil button in Songs, so the lyrics show with their gaps
  // from the start. Show all turns it off for the rest of the visit.
  const lyricQuiz = !!route.params?.fillIn && route.params.songId === activeSongId;
  const [answeredGaps, setAnsweredGaps] = useState<Set<string>>(new Set());
  // Words (lowercased) whose meaning quiz was answered since the song opened, so tapping one again
  // doesn't ask it again
  const [answeredMeanings, setAnsweredMeanings] = useState<Set<string>>(new Set());
  // The tap whose word was opened in Look Up (word|line|occurrence): its meaning quiz stays hidden on
  // return, since Look Up showed the answer. Another tap, or the same one later, asks it again.
  const [lookedUpTap, setLookedUpTap] = useState<string | null>(null);
  const selectedTap = selectedWord ? `${selectedWord.toLowerCase()}|${selectedLineIndex}|${selectedOccurrence}` : null;
  const selectedTapRef = useRef(selectedTap);
  selectedTapRef.current = selectedTap;
  useEffect(() => navigation.addListener('blur', () => {
    if (selectedTapRef.current) setLookedUpTap(selectedTapRef.current);
  }), [navigation]);
  useEffect(() => {
    if (!selectedWord) setLookedUpTap(null);
  }, [selectedWord]);
  // The selected word's meaning quiz is showing and not answered, so its card hides Also in translations
  const [meaningQuizPending, setMeaningQuizPending] = useState(false);
  const [meaningQuizAnswered, setMeaningQuizAnswered] = useState(false);
  // A word just removed from its card's level picker, or ignored, offered back with Undo for a few seconds
  const [removedWord, setRemovedWord] = useState<{ entry: WordEntry } | null>(null);
  useEffect(() => {
    if (!removedWord) return;
    const timer = setTimeout(() => setRemovedWord(null), 5000);
    return () => clearTimeout(timer);
  }, [removedWord]);
  // The gap being answered, kept while its answer shows even though the word is no longer a gap
  const [gapTarget, setGapTarget] = useState<{ entryId: string; lineIndex: number; occurrence: number } | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [computedLines, setComputedLines] = useState<LearnLine[]>([]);

  // Whether a lyric word is a gap to fill in, until it's answered
  const gapEntry = useCallback(
    (cleanedWord: string): WordEntry | undefined => {
      if (!lyricQuiz || !canFillGaps(wordEntryIndex)) return undefined;
      const entry = gapWord(wordEntryIndex, cleanedWord, Date.now());
      return entry && !answeredGaps.has(entry.id) ? entry : undefined;
    },
    [lyricQuiz, wordEntryIndex, answeredGaps]
  );

  // The translations turned off in Learn Settings stay off in every song and after a restart
  const [hiddenTranslations, setHiddenTranslations] = usePersistedState<string[]>(
    '@lyricsionary_hidden_translations',
    [],
    (v): v is string[] => Array.isArray(v) && v.every((k) => typeof k === 'string')
  );
  const filledTranslationsKey = song ? translationNames(song.translations).filter((_, i) => song.translations[i].lyrics.trim()).map(t => t.key).join('|') : '';
  // Initialize selected languages when song changes
  useEffect(() => {
    if (!song) {
      setLocalSelectedLanguages([]);
      setSelectedTranslationLanguages([]);
      return;
    }

    // A language selection belongs to the current song. Reset it when the
    // route changes so the previous song's translations are not carried over.
    // A translation still waiting for DeepL has no lyrics yet: it's selected, and translations turned on, once it fills in
    const availableLanguages = translationNames(song.translations).filter((_, i) => song.translations[i].lyrics.trim()).map(t => t.key);
    const selected = availableLanguages.filter((key) => !hiddenTranslations.includes(key));
    setLocalSelectedLanguages(selected);
    setSelectedTranslationLanguages(selected);
    // Unselecting every language on the previous song turned translations off
    if (selected.length > 0 && !useStore.getState().showTranslations) toggleTranslations();
    setUnblurredTranslations(new Set());
  }, [song?.id, filledTranslationsKey, hiddenTranslations, setSelectedTranslationLanguages]);

  // Helper function to normalize text for comparison (remove punctuation, compare words only)
  const normalizeText = (text: string): string => {
    return text
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .trim()
      .toLowerCase();
  };

  // Helper: find the best-matching WordContext for a word on a given line
  const findWordContext = useCallback((wordEntry: { contexts?: WordContext[]; emoji?: string; definitions?: { text: string }[] }, line: string, occurrence?: number): {
    emoji: string | undefined;
    ipa: string | undefined;
    definition: string | undefined;
    partOfSpeech?: PartOfSpeech;
  } | null => {
    if (!wordEntry.contexts || wordEntry.contexts.length === 0) return null;
    const occ = occurrence || 1;
    // Try matching by songId + context line + occurrence first
    const bySongLineOcc = wordEntry.contexts.find(c =>
      c.songId === song?.id && c.context === line && (c.occurrence || 1) === occ
    );
    if (bySongLineOcc) {
      return { emoji: bySongLineOcc.emoji, ipa: bySongLineOcc.ipa, definition: bySongLineOcc.definition, partOfSpeech: bySongLineOcc.partOfSpeech };
    }
    // Try matching by songId + context line (no occurrence)
    const bySongAndLine = wordEntry.contexts.find(c =>
      c.songId === song?.id && c.context === line && !c.occurrence
    );
    if (bySongAndLine) {
      return { emoji: bySongAndLine.emoji, ipa: bySongAndLine.ipa, definition: bySongAndLine.definition, partOfSpeech: bySongAndLine.partOfSpeech };
    }
    // Try matching by songId only
    const bySong = wordEntry.contexts.find(c => c.songId === song?.id);
    if (bySong) {
      return { emoji: bySong.emoji, ipa: bySong.ipa, definition: bySong.definition, partOfSpeech: bySong.partOfSpeech };
    }
    // Try matching by context line text only
    const byLine = wordEntry.contexts.find(c => c.context === line);
    if (byLine) {
      return { emoji: byLine.emoji, ipa: byLine.ipa, definition: byLine.definition, partOfSpeech: byLine.partOfSpeech };
    }
    // Fall back to first context
    const first = wordEntry.contexts[0];
    return { emoji: first.emoji, ipa: first.ipa, definition: first.definition, partOfSpeech: first.partOfSpeech };
  }, [song?.id]);

  // Compute lines asynchronously to avoid blocking initial render
  useEffect(() => {
    if (!song) {
      setComputedLines([]);
      return;
    }

    // Use setTimeout to defer computation to next tick, allowing UI to render first
    const timer = setTimeout(() => {
      // Another original's lines may not match the translations', which stay with the main one
      const shownOriginal = learnOriginal(song);
      const originalLines = shownOriginal.lyrics.split('\n');
      const translationLines = song.translations.map((t) => (shownOriginal.aligned ? t.lyrics.split('\n') : []));
      const names = translationNames(song.translations);
      // A song in Cyrillic, Greek, Korean, Hindi or Arabic without a Romanized version gets one made here
      const romanizeLanguage = song.translations.some((t) => isRomanized(t.language))
        ? null
        : song.originalLanguages?.[0] ?? '';
      const newLines = originalLines.map((line, i) => {
        const originalNormalized = normalizeText(line);
        const translations = translationLines.map((tl, ti) => {
          const translationText = tl[i] || '';
          if (!shownOriginal.aligned) return { language: song.translations[ti].language, key: names[ti].key, label: names[ti].duplicated ? names[ti].name : undefined, icon: names[ti].icon, text: '', show: false };
          const translationNormalized = normalizeText(translationText);
          // Only include translation if it's different from original (word-wise comparison)
          const isDifferent = originalNormalized !== translationNormalized;
          return {
            language: song.translations[ti].language,
            key: names[ti].key,
            label: names[ti].duplicated ? names[ti].name : undefined,
            icon: names[ti].icon,
            text: translationText,
            show: isDifferent,
          };
        });
        return {
          original: line,
          translations,
          romanized: romanizeLanguage !== null ? romanizeLine(line, romanizeLanguage) ?? undefined : undefined,
        };
      });
      setComputedLines(newLines);
    }, 0);

    return () => clearTimeout(timer);
  }, [song]);

  // Fill in the lyrics hides the romanized lines, which would give the gaps away
  const lines = useMemo(
    () => lyricQuiz
      ? computedLines.map((line) => ({
          ...line,
          translations: line.translations.map((tl) => (isRomanized(tl.language) ? { ...tl, show: false } : tl)),
          romanized: undefined,
        }))
      : computedLines,
    [computedLines, lyricQuiz]
  );

  // Blank lines between verses aren't lyrics
  const lineCount = lines.filter((line) => line.original.trim()).length;
  const contentLines = useMemo(
    () => lines.flatMap((line, i) => (line.original.trim() ? [i] : [])),
    [lines]
  );
  // Starts at the tapped or found line, or the first
  // On while a word's card is open, unless 1 by 1 was on already
  const autoLineByLine = useRef(false);
  const autoLineByLineSetting = useStore((s) => s.autoLineByLine);
  const toggleLineByLine = () => {
    autoLineByLine.current = false;
    if (lineByLine !== null) {
      const at = lineByLine;
      setLineByLine(null);
      setScrollToLine({ index: at, key: Date.now() });
      return;
    }
    const start = [selectedLineIndex, foundLine].find((i) => i !== null && contentLines.includes(i));
    setLineByLine(start ?? contentLines[0]);
  };
  useEffect(() => {
    autoLineByLine.current = false;
    setLineByLine(null);
  }, [song?.id]);
  // A selected word shows only its line, so the lyrics can't be scrolled away from it by accident
  useEffect(() => {
    if (!autoLineByLineSetting || selectedWord === null || selectedLineIndex === null || !contentLines.includes(selectedLineIndex)) return;
    if (lineByLine === null) autoLineByLine.current = true;
    else if (!autoLineByLine.current) return;
    setLineByLine(selectedLineIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWord, selectedLineIndex]);
  // Back to every line once the word card closes
  useEffect(() => {
    if (selectedWord !== null || !autoLineByLine.current) return;
    autoLineByLine.current = false;
    if (lineByLine !== null) setScrollToLine({ index: lineByLine, key: Date.now() });
    setLineByLine(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWord]);
  // Updates as words are saved or ignored, like the song's progress in Songs
  const progressSongs = useMemo(() => (song ? [song] : []), [song]);
  const wordProgress = useWordProgress(progressSongs).get(song?.id ?? '');

  // Fill in the lyrics: the gap card rebuilds its whole line from shuffled words instead
  const [drillingLine, setDrillingLine] = useState(false);
  useEffect(() => setDrillingLine(false), [gapTarget]);
  // Now and then the gap is on the word's line from another song it was saved from, to recall it out of this song too
  const [gapElsewhere, setGapElsewhere] = useState(false);
  useEffect(() => setGapElsewhere(Math.random() < 1 / 3), [gapTarget]);

  // Opened at a word, e.g. from another song's word card: select it on its line and scroll there
  const [scrollToLine, setScrollToLine] = useState<{ index: number; key: number; center?: boolean } | null>(null);

  // Every line in this song: where the selected word comes up, stepped through from its card
  const wordSpots = useMemo(
    () => (selectedWord ? findWordSpots(lines.map((line) => line.original), selectedWord, (candidate) => !!findSavedEntry(candidate), elidedStartsOf) : []),
    [selectedWord, lines, findSavedEntry, elidedStartsOf]
  );
  const wordSpotIndex = wordSpots.findIndex((s) => s.lineIndex === selectedLineIndex && s.occurrence === selectedOccurrence);
  const goToWordSpot = (step: 1 | -1) => {
    const spot = stepWordSpot(wordSpots, wordSpotIndex === -1 ? null : wordSpots[wordSpotIndex], step);
    if (!spot) return;
    setSelectedLine(lines[spot.lineIndex].original);
    setSelectedLineIndex(spot.lineIndex);
    setSelectedOccurrence(spot.occurrence);
    setScrollToLine({ index: spot.lineIndex, key: Date.now() });
  };

  // Spotify: follows the song while it plays, highlighting and scrolling to its line, and seeks by line
  const spotifyConnected = useStore((s) => s.spotifyConnected);
  const wideWordSpacing = useStore((s) => s.wideWordSpacing);
  const annotationGap = useStore((s) => s.annotationGap);
  const cycleAnnotationGap = useStore((s) => s.cycleAnnotationGap);
  const highlightNewWords = useStore((s) => s.highlightNewWords);
  const toggleHighlightNewWords = useStore((s) => s.toggleHighlightNewWords);
  const quietKnownWords = useStore((s) => s.quietKnownWords);
  const toggleQuietKnownWords = useStore((s) => s.toggleQuietKnownWords);
  const toggleAutoLineByLine = useStore((s) => s.toggleAutoLineByLine);
  const autoPlayAudio = useStore((s) => s.autoPlayAudio);
  const toggleAutoPlayAudio = useStore((s) => s.toggleAutoPlayAudio);
  const toggleWideWordSpacing = useStore((s) => s.toggleWideWordSpacing);
  const originalLines = useMemo(() => lines.map((line) => line.original), [lines]);
  const spotify = useSpotifyLyricsSync(song, originalLines, spotifyConnected);
  // Songs whose "No synced lyrics" bar was closed, so it stays hidden for them
  const [noSyncHiddenSongs, setNoSyncHiddenSongs] = usePersistedState<string[]>(
    '@lyricsionary_no_sync_hidden_songs',
    [],
    (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')
  );
  const noSyncHidden = !!song && noSyncHiddenSongs.includes(song.id);
  // Closing the "Playing, no synced lyrics" note hides the whole bar for this song until the app restarts
  const [playingNoteClosed, setPlayingNoteClosed] = useState<string[]>([]);
  const barGone = !!song && noSyncHidden && spotify.timings === 'none' && spotify.isThisSong && playingNoteClosed.includes(song.id);
  const nextLine = useNextLineToLearn(song, originalLines);
  const [followSpotify, setFollowSpotify] = usePersistedState('@lyricsionary_follow_spotify', true, (v): v is boolean => typeof v === 'boolean');
  // A long press on a line's word copies the line with its translations, to share it
  const [copiedLine, setCopiedLine] = useState(false);
  useEffect(() => {
    if (!copiedLine) return;
    const timer = setTimeout(() => setCopiedLine(false), 2000);
    return () => clearTimeout(timer);
  }, [copiedLine]);
  // A held line offers copying and editing, instead of copying straight away
  const [heldLine, setHeldLine] = useState<number | null>(null);
  const copyLine = (lineIndex: number) => {
    const line = lines[lineIndex];
    if (!line?.original.trim()) return;
    const translations = line.translations
      .filter((t) => localSelectedLanguages.includes(t.key) && t.text.trim())
      .map((t) => t.text.trim());
    void Clipboard.setStringAsync([line.original.trim(), ...translations].join('\n'));
    setCopiedLine(true);
  };

  // Filling in the lyrics: only the lines with saved words answered wrong lately, to drill the hard parts
  const [trickyLinesOnly, setTrickyLinesOnly] = useState(false);
  useEffect(() => setTrickyLinesOnly(false), [song?.id, lyricQuiz]);
  const trickyLines = useMemo(() => {
    if (!lyricQuiz) return new Set<number>();
    const now = Date.now();
    const found = new Set<number>();
    lines.forEach((line, lineIndex) => {
      for (const token of splitLyricTokens(line.original)) {
        const entry = wordEntryIndex.get(cleanLyricWord(token).toLowerCase());
        if (entry && quizKindFor(entry.masteryLevel) === 'lyric' && isTricky(entry.quiz, now)) {
          found.add(lineIndex);
          return;
        }
      }
    });
    return found;
  }, [lyricQuiz, lines, wordEntryIndex]);

  // Dictation: a line hidden until it's written down from listening
  const [dictation, setDictation] = useState<{ lineIndex: number; checked: boolean } | null>(null);
  useEffect(() => setDictation(null), [song?.id]);
  // Quiz mode: one quiz on each line in turn, or on the line Spotify plays, in place of the lyrics
  const [quizMode, setQuizMode] = useState<{ startLine: number } | null>(null);
  useEffect(() => setQuizMode(null), [song?.id, lyricQuiz]);
  useEffect(() => {
    if (followSpotify && spotify.currentLine !== null) setScrollToLine({ index: spotify.currentLine, key: Date.now() });
  }, [followSpotify, spotify.currentLine]);
  const focus = route.params?.focus;
  // A line found by searching the lyrics stays marked until a word is tapped
  const [foundLine, setFoundLine] = useState<number | null>(null);
  useEffect(() => {
    if (selectedWord) setFoundLine(null);
  }, [selectedWord]);
  useEffect(() => setFoundLine(null), [song?.id]);
  useEffect(() => {
    if (!focus || isRendering) return;
    const lineIndex = lines.findIndex((line) => line.original === focus.line);
    if (lineIndex === -1) return;
    setSelectedWord(focus.word ?? null);
    setFoundLine(focus.word ? null : lineIndex);
    setSelectedLine(focus.line);
    setSelectedLineIndex(lineIndex);
    setSelectedOccurrence(focus.occurrence ?? 1);
    setScrollToLine({ index: lineIndex, key: Date.now() });
    navigation.setParams({ focus: undefined });
  }, [focus, isRendering, lines, navigation]);

  // Turn off loading state once lines are computed
  useEffect(() => {
    if (song && computedLines.length > 0) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          setIsLoadingSong(false);
          setIsRendering(false);
        }, 50);
      });
    }
  }, [song, computedLines]);

  // Reset rendering state when song changes
  useEffect(() => {
    if (activeSongId) {
      setIsRendering(true);
    }
  }, [activeSongId]);

  // Gaps come back each time fill in the lyrics starts
  useEffect(() => {
    setAnsweredGaps(new Set());
    setGapTarget(null);
  }, [lyricQuiz]);

  // Reset unblurred translations when blur toggle changes or song changes
  useEffect(() => {
    setUnblurredTranslations(new Set());
  }, [blurTranslations, activeSongId]);

  useEffect(() => {
    setRevealedOriginals(new Set());
  }, [reverseLyrics, activeSongId]);

  useEffect(() => {
    setSeenTranslationLines(new Set());
    setSeenAllTranslations(false);
    setAnsweredGaps(new Set());
    setAnsweredMeanings(new Set());
    setGapTarget(null);
  }, [activeSongId]);

  useEffect(() => {
    if (!blurTranslations && showTranslations) setSeenAllTranslations(true);
  }, [blurTranslations, showTranslations]);

  // Close word panel when switching songs
  useEffect(() => {
    setSelectedWord(null);
    setSelectedLine(null);
    setSelectedLineIndex(null);
    setSelectedOccurrence(1);
  }, [activeSongId]);

  const handleLanguageChange = (languages: string[]) => {
    setLocalSelectedLanguages(languages);
    // Remember what was turned off or on among this song's translations
    const available = song ? translationNames(song.translations).map((t) => t.key) : [];
    const hidden = [
      ...hiddenTranslations.filter((key) => !languages.includes(key)),
      ...available.filter((key) => !languages.includes(key) && !hiddenTranslations.includes(key)),
    ];
    if (hidden.length !== hiddenTranslations.length || hidden.some((key) => !hiddenTranslations.includes(key))) {
      setHiddenTranslations(hidden);
    }
    if (languages.length === 0) {
      // If no languages selected, turn off translations
      if (showTranslations) {
        toggleTranslations();
      }
    } else {
      // If languages selected, turn on translations
      if (!showTranslations) {
        toggleTranslations();
      }
    }
  };

  // Mark mode: tapping or dragging across words picks them, to mark them all Known at once. Picked by
  // the word in lower case, so each of its occurrences shows picked
  const [markMode, setMarkMode] = useState(false);
  const [marked, setMarked] = useState<Map<string, { word: string; line: string; lineIndex: number; occurrence: number }>>(new Map());
  const [markedToast, setMarkedToast] = useState<string | null>(null);
  useEffect(() => {
    if (!markedToast) return;
    const timer = setTimeout(() => setMarkedToast(null), 3000);
    return () => clearTimeout(timer);
  }, [markedToast]);
  const pickWord = (word: string, line: string, lineIndex: number, occurrence: number, toggle: boolean) => {
    const cleaned = isSplitPhrase(word) ? word : cleanLyricWord(word);
    if (!cleaned || !isTappableLyric(cleaned)) return;
    const key = cleaned.toLowerCase();
    setMarked((prev) => {
      if (prev.has(key) && !toggle) return prev;
      const next = new Map(prev);
      if (prev.has(key)) next.delete(key);
      else next.set(key, { word: cleaned, line, lineIndex, occurrence });
      return next;
    });
  };
  const exitMarkMode = () => {
    setMarkMode(false);
    setMarked(new Map());
  };
  const startMarkMode = () => {
    setSelectedWord(null);
    setMarkMode(true);
  };
  // Saves the words not saved yet as Known and moves the saved ones up to it
  const markPickedKnown = async () => {
    const language = song?.originalLanguages?.[0];
    if (!song || !language || marked.size === 0) return;
    const picked = [...marked.values()];
    exitMarkMode();
    const ids = new Set<string>();
    const adds: Promise<void>[] = [];
    for (const item of picked) {
      // A word marked Known is no longer ignored
      if (isIgnoredWord(item.word, language)) void toggleIgnoredWord(item.word, language);
      const saved = findSavedEntry(item.word);
      if (saved) {
        ids.add(saved.id);
        continue;
      }
      const cached = getPreloadedWord(language, item.word);
      const definition = cached?.definitions?.[0];
      adds.push(addOrUpdateWord(item.word, language, cached?.ipa || undefined, [{
        context: item.line,
        definition: definition?.text,
        partOfSpeech: definition ? normalizePartOfSpeech(definition.partOfSpeech) : undefined,
        songId: song.id,
        songName: song.songName,
        fromSong: true,
        occurrence: item.occurrence,
      }], 'Known'));
    }
    await Promise.all(adds);
    if (ids.size) await setWordsLevel([...ids], 'Known');
    setMarkedToast(`Marked ${picked.length} ${picked.length === 1 ? 'word' : 'words'} Known`);
  };

  // Ignores the picked words that aren't saved; saved ones are left as they are
  const ignorePicked = async () => {
    const language = song?.originalLanguages?.[0] || 'unknown';
    const picked = [...marked.values()].filter((item) => !findSavedEntry(item.word) && !isIgnoredWord(item.word, language));
    const skipped = [...marked.values()].filter((item) => findSavedEntry(item.word)).length;
    if (marked.size === 0) return;
    exitMarkMode();
    for (const item of picked) await toggleIgnoredWord(item.word, language);
    const done = `Ignored ${picked.length} ${picked.length === 1 ? 'word' : 'words'}`;
    setMarkedToast(skipped ? `${done}, ${skipped} saved left as is` : done);
  };

  // The word the last tap saved as new, which a longer Chinese or Japanese word grown from it replaces
  const autoSavedWordRef = useRef<string | null>(null);

  // `single` is the word itself when it's tapped as part of a phrase whose words sit apart, e.g. hört in
  // hört … auf: tapping it again once the phrase is selected selects just the word
  const handleWordPress = (word: string, line: string, lineIndex: number, occurrence: number, single?: { word: string; occurrence: number }) => {
    if (single && word.toLowerCase() === selectedWord?.toLowerCase() && lineIndex === selectedLineIndex && occurrence === selectedOccurrence) {
      handleWordPress(single.word, line, lineIndex, single.occurrence);
      return;
    }
    if (markMode) {
      pickWord(single?.word ?? word, line, lineIndex, single?.occurrence ?? occurrence, true);
      return;
    }
    const cleaned = isSplitPhrase(word) ? word : cleanLyricWord(word);
    autoSavedWordRef.current = null;
    if (isTappableLyric(cleaned)) {
      setSelectedWord(cleaned);
      setSelectedLine(line);
      setSelectedLineIndex(lineIndex);
      setSelectedOccurrence(occurrence);
      // The word card opening above the lyrics pushes the line down, so it's brought back to the middle
      setScrollToLine({ index: lineIndex, key: Date.now(), center: true });
    }
  };

  // Selects a word or phrase dragged across, e.g. 二人 or "give up", ending at `end` in the line. The word
  // a tap just saved inside it, e.g. 二, is replaced by it. A phrase of words written apart keeps it, since
  // the phrase is saved only when Wiktionary has it
  const selectPhrase = (word: string, line: string, lineIndex: number, end: number, dragged?: { words: string[]; start: number }) => {
    // Three or more words dragged across can leave the ones between out, e.g. hört all dieser Schmerz auf -> hört … auf
    setDragSelection(dragged && dragged.words.length >= 3
      ? { phrase: word, line, lineIndex, start: dragged.start, words: dragged.words, dropped: [] }
      : null);
    // A word grown from the one just tapped, e.g. 二人 from 二, is saved instead of it
    const fetching = wordFetchRef.current;
    if (fetching && fetching.word === selectedWord && lineIndex === selectedLineIndex && !/\s/.test(word.trim()) && word.includes(fetching.word)) {
      fetching.cancelled = true;
    }
    const autoSaved = autoSavedWordRef.current;
    autoSavedWordRef.current = null;
    if (autoSaved && !/\s/.test(word.trim()) && autoSaved === selectedWord && lineIndex === selectedLineIndex && word.includes(autoSaved)) {
      const entry = findSavedEntry(autoSaved);
      if (entry && entry.contexts.length <= 1) void deleteWord(entry.id);
    }
    setSelectedWord(word);
    setSelectedLine(line);
    setSelectedLineIndex(lineIndex);
    setSelectedOccurrence(Math.max(1, line.slice(0, end).split(word).length - 1));
    setScrollToLine({ index: lineIndex, key: Date.now(), center: true });
  };

  // The words of a phrase dragged across, to leave some of them out, and which are left out
  const [dragSelection, setDragSelection] = useState<{
    phrase: string; line: string; lineIndex: number; start: number; words: string[]; dropped: number[];
  } | null>(null);

  // Selects some words of a line as one: next to each other as a phrase, apart as hört … auf, one as itself
  const selectLineWords = (words: { word: string; index: number }[], line: string, lineIndex: number, start: number) => {
    if (words.length === 0) return;
    const phrase = joinLineWords(words);
    setSelectedWord(phrase);
    setSelectedLine(line);
    setSelectedLineIndex(lineIndex);
    setSelectedOccurrence(phraseOccurrenceAt(line, phrase, start));
  };

  // Where each word of each line is laid out, to find the words a drag goes across
  const wordRectsRef = useRef<Record<number, (WordRect | undefined)[]>>({});
  // The words being dragged across, shown selected until the finger lifts
  const [dragRange, setDragRange] = useState<{ lineIndex: number; from: number; to: number } | null>(null);
  const dragStartRef = useRef(-1);

  const handleTranslationPress = (lineIndex: number, translationIndex: number) => {
    const key = `${lineIndex}-${translationIndex}`;
    if (blurTranslations) {
      if (!unblurredTranslations.has(key)) {
        setUnblurredTranslations((prev) => new Set(prev).add(key));
        setSeenTranslationLines((prev) => new Set(prev).add(lineIndex));
      } else {
        setUnblurredTranslations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      }
    }
  };

  // IPA of unsaved words preloaded from Wiktionary as their lines scroll into view is cached (utils/preloadedIpa),
  // also across restarts. Read from there, so a lookup only redraws the lines it belongs to
  // Words waiting for or being looked up, which show the loading spinner a tapped word does
  const preloadPendingRef = useRef(new Set<string>());
  const [preloadedLines, setPreloadedLines] = useState<Record<number, number>>({});
  const [visibleRange, setVisibleRange] = useState<{ from: number; to: number } | null>(null);

  // The meaning above a saved word that fits the line's translation, when the saved one isn't in it,
  // e.g. auch saved as "even" in "I think you are, too" shows "too", like Look Up fills it in.
  // Uses the saved meanings and Wiktionary's, once read; null keeps the saved one
  const fittingMeaning = (entry: WordEntry, ctx: { definition?: string } | null, lineIndex: number): string | null => {
    const translation = lines[lineIndex]?.translations
      .filter((tl) => !isRomanized(tl.language) && tl.text)
      .map((tl) => tl.text)
      .join(' / ');
    if (!translation) return null;
    const saved = ctx?.definition || entry.contexts.find((c) => c.definition)?.definition;
    if (saved && findDefinitionHighlight(translation, [saved])) return null;
    const wiktionary = peekWiktionaryDefinitions(entry.word, entry.language) ?? [];
    const candidates = [
      ...entry.contexts.filter((c) => c.definition).map((c) => ({ text: c.definition!, partOfSpeech: c.partOfSpeech ?? '' })),
      ...(entry.definitions ?? []).map((d) => ({ text: d.text, partOfSpeech: '' })),
      ...wiktionary,
    ] as Parameters<typeof pickDefinition>[0];
    const unique = new Set(candidates.map((d) => d.text));
    if (unique.size < 2) return null;
    const picked = pickDefinition(candidates, translation);
    return picked && picked !== saved ? picked : null;
  };

  // Saved words in view have their Wiktionary meanings read, so the line's translation can pick the one it's about
  const fittingRequestedRef = useRef(new Set<string>());
  useEffect(() => {
    if (!showMeaning || !visibleRange) return;
    for (let li = visibleRange.from; li <= visibleRange.to; li++) {
      const line = lines[li];
      if (!line || !line.translations.some((tl) => tl.text)) continue;
      for (const token of splitLyricTokens(line.original)) {
        const word = cleanLyricWord(token);
        const entry = word ? findSavedEntry(word) : undefined;
        if (!entry) continue;
        const key = `${entry.language}\u0000${entry.word}`;
        if (fittingRequestedRef.current.has(key) || peekWiktionaryDefinitions(entry.word, entry.language)) continue;
        fittingRequestedRef.current.add(key);
        getWiktionaryDefinitions(entry.word, entry.language).then((defs) => {
          if (!defs?.length || !preloadAliveRef.current) return;
          setPreloadedLines((prev) => Object.fromEntries(Object.keys(prev).concat(lines.map((_, i) => String(i))).map((i) => [i, (prev[+i] ?? 0) + 1])));
        }).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMeaning, visibleRange, lines]);

  const renderPressableText = useCallback((text: string, lineIndex: number) => {
    // CJK scripts do not separate words with spaces, so each CJK character is a selectable token, joined
    // back into a word when the characters are a saved word, or the word being selected, e.g. 二人
    // Words written apart join into a saved or selected phrase the same way, e.g. "give up" or yêu thương
    const isSelectedLine = lineIndex === selectedLineIndex;
    const isWord = (candidate: string) => (isSelectedLine && candidate === selectedWord) || !!findSavedEntry(candidate);
    const cjkGrouped = groupCjkTokens(splitLyricTokens(text), isWord);
    const textWords = groupSpacedWords(cjkGrouped, isWord);
    const occurrenceMap: Record<number, number> = {};
    const wordCountMap: Record<string, number> = {};
    // How many times each elided start, e.g. j', has come up so far in the line
    const elidedStartCounts: Record<string, number> = {};
    // Where each token ends in the line, so a grown selection knows which occurrence it is
    const tokenEnds: number[] = [];
    let offset = 0;
    textWords.forEach((w, i) => {
      offset += w.length;
      tokenEnds[i] = offset;
      if (!w.trim()) return;
      const cleaned = cleanLyricWord(w);
      if (cleaned) {
        wordCountMap[cleaned.toLowerCase()] = (wordCountMap[cleaned.toLowerCase()] || 0) + 1;
        occurrenceMap[i] = wordCountMap[cleaned.toLowerCase()];
      }
    });
    // Words of a phrase that sit apart, e.g. hört and auf of hört … auf, show and select as the phrase
    const wordOccurrences = { ...occurrenceMap };
    const splitParts = new Map<number, { phrase: string; part: number }>();
    const splitCandidates = isSelectedLine && selectedWord && isSplitPhrase(selectedWord) ? [selectedWord, ...savedSplitPhrases] : savedSplitPhrases;
    for (const hit of splitCandidates.length ? findSplitPhrases(textWords, splitCandidates) : []) {
      hit.indices.forEach((index, part) => {
        splitParts.set(index, { phrase: hit.phrase, part });
        occurrenceMap[index] = hit.occurrence;
      });
    }
    // Dragging across words selects them as one, Chinese, Japanese or Thai characters as a word, e.g. 二人,
    // others as a phrase, e.g. "give up". Vertical drags fall through to scrolling
    const rects = (wordRectsRef.current[lineIndex] ??= []);
    const onWordLayout = (i: number) => (event: LayoutChangeEvent) => {
      rects[i] = event.nativeEvent.layout;
    };
    const wordAt = (x: number, y: number) =>
      findWordIndex(textWords.map((w, i) => (w.trim() && cleanLyricWord(w) ? rects[i] : undefined)), x, y);
    const dragTo = (x: number, y: number) => {
      const end = wordAt(x, y);
      return end < 0 ? null : draggedPhrase(textWords, dragStartRef.current, end);
    };
    const isDragged = (i: number) => dragRange?.lineIndex === lineIndex && i >= dragRange.from && i <= dragRange.to;
    const drag = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-8, 8])
      .failOffsetY([-12, 12])
      .onStart((event) => {
        dragStartRef.current = wordAt(event.x - event.translationX, event.y - event.translationY);
        if (dragStartRef.current < 0) return;
        const range = dragTo(event.x, event.y);
        if (range) setDragRange({ lineIndex, from: range.from, to: range.to });
      })
      .onUpdate((event) => {
        if (dragStartRef.current < 0) return;
        const range = dragTo(event.x, event.y);
        if (range) setDragRange((prev) =>
          prev?.from === range.from && prev.to === range.to ? prev : { lineIndex, from: range.from, to: range.to });
      })
      .onEnd((event) => {
        if (dragStartRef.current < 0) return;
        const range = dragTo(event.x, event.y) ?? draggedPhrase(textWords, dragStartRef.current, dragStartRef.current);
        if (range.from === range.to) handleWordPress(textWords[range.from], text, lineIndex, occurrenceMap[range.from] || 1);
        else if (markMode) {
          for (let j = range.from; j <= range.to; j++) pickWord(textWords[j], text, lineIndex, occurrenceMap[j] || 1, false);
        } else if (isTappableLyric(range.word)) {
          const words = textWords.slice(range.from, range.to + 1).map(cleanLyricWord).filter(Boolean);
          const start = tokenEnds[range.from] - textWords[range.from].length;
          selectPhrase(range.word, text, lineIndex, tokenEnds[range.to], { words, start });
        }
      })
      .onFinalize(() => {
        dragStartRef.current = -1;
        setDragRange(null);
      });
    return (
      <GestureDetector gesture={drag}>
      <View
        style={{
          flexDirection: isRtlSong !== !!I18nManager.isRTL ? 'row-reverse' : 'row',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          rowGap: wideWordSpacing ? fontSize * 0.4 : 0,
        }}
      >
        {textWords.map((word, i) => {
          if (!word.trim()) {
            // Wide spacing: more room between words, so a tap lands on the one meant
            return (
              <Text key={i} style={{ fontSize, lineHeight: fontSize * 1.6, marginHorizontal: wideWordSpacing ? fontSize * 0.3 : 0 }}>
                {word}
              </Text>
            );
          }

          const split = splitParts.get(i);
          const cleanedWord = split?.phrase ?? cleanLyricWord(word);
          // Tapping a part of a selected phrase whose words sit apart selects the word on its own
          const single = split ? { word, occurrence: wordOccurrences[i] || 1 } : undefined;

          // A phrase like "tout à fait" shows whole, as saved or being selected
          const isPhrase = cleanedWord.includes(' ');
          const hasContractedPrefixWord = !isPhrase && hasContractedPrefix(cleanedWord);

          // Check if this word should be split for elision rendering (e.g., l'essence → l' + essence, dell'umanità → dell' + umanità),
          // unless the whole word is saved (e.g., c'est)
          const elisionParts = cleanedWord && hasContractedPrefixWord && (hasFrenchLanguage || hasItalianLanguage) && !findWordEntry(cleanedWord)
            ? splitElisionParts(cleanedWord)
            : null;

          if (elisionParts && elisionParts.length > 1) {
            // Compute display parts by splitting the original text to match the cleaned parts
            // The punctuation around the word stays uncolored, e.g. the comma in l'amour,
            const { leading, trailing } = splitEdgePunctuation(word);
            const cleanStart = leading.length;
            const cleanEnd = word.length - trailing.length;

            const displayParts: string[] = [];
            let pos = cleanStart;
            for (let p = 0; p < elisionParts.length; p++) {
              const partLength = elisionParts[p].length;
              if (p === 0) {
                displayParts.push(word.slice(cleanStart, cleanStart + partLength));
                pos = cleanStart + partLength;
              } else if (p === elisionParts.length - 1) {
                displayParts.push(word.slice(pos, cleanEnd));
              } else {
                displayParts.push(word.slice(pos, pos + partLength));
                pos += partLength;
              }
            }

            const isElisionIgnored = isIgnoredWord(cleanedWord, song?.originalLanguages?.[0] || 'unknown');
            const partEntries = elisionParts.map(part =>
              part ? findWordEntry(part) ?? null : null
            );

            const mainEntry = [...partEntries].reverse().find(e => e !== null) || null;

            const ctx = mainEntry ? findWordContext(mainEntry, text, occurrenceMap[i] || 1) : null;

            // Known words go without IPA and emoji
            const quiet = quietKnownWords && mainEntry?.masteryLevel === 'Known';
            let displayContent = '';
            if (showIpa && mainEntry && !quiet) {
              const ipaValue = formIpa(mainEntry, cleanedWord) || ctx?.ipa || mainEntry.pronunciation;
              if (ipaValue) {
                displayContent = formatIpa(ipaValue, showIpaBrackets);
              }
            }

            const contextEmoji = ctx?.emoji;
            const globalEmoji = mainEntry?.emoji;
            const effectiveEmoji = contextEmoji || globalEmoji;
            const shouldShowEmoji = showEmoji && mainEntry && !quiet && effectiveEmoji &&
              effectiveEmoji !== getFlagForLanguage(mainEntry.language);

            const meaningText = showMeaning && mainEntry && !quiet ? meaningAbove(mainEntry, ctx, fittingMeaning(mainEntry, ctx, lineIndex)) : '';

            return (
              <View key={i} onLayout={onWordLayout(i)} style={{ alignItems: 'center' }}>
                <View style={styles.annotationSpace}>
                  {shouldShowEmoji && (
                    <Text style={styles.wordAnnotation}>
                      {effectiveEmoji}
                    </Text>
                  )}
                  {(!!meaningText || !!displayContent) && (
                    <View style={[styles.annotationStack, { paddingHorizontal: annotationGap }]}>
                      {!!meaningText && (
                        <Text style={styles.wordAnnotation}>
                          {meaningText}
                        </Text>
                      )}
                      {!!displayContent && (
                        <Text style={styles.wordAnnotation}>
                          {displayContent}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
                <Text style={{ fontSize, lineHeight: fontSize * 1.6, color: Colors.text }}>
                  {leading}
                  {elisionParts.map((part, pi) => {
                    const partEntry = partEntries[pi];
                    // The start of the word, e.g. j', is selected on its own; the rest selects the whole word
                    const isElidedStart = pi < elisionParts.length - 1;
                    const startOccurrence = isElidedStart ? (elidedStartCounts[part.toLowerCase()] = (elidedStartCounts[part.toLowerCase()] || 0) + 1) : 0;
                    const isStartSelected = isElidedStart && !!selectedWord && part.toLowerCase() === selectedWord.toLowerCase() &&
                      lineIndex === selectedLineIndex && startOccurrence === selectedOccurrence;
                    const isPartSelected = (selectedWord && cleanedWord.toLowerCase() === selectedWord.toLowerCase()) || isStartSelected;
                    const isPartActiveOccurrence = isStartSelected ||
                      (isPartSelected && lineIndex === selectedLineIndex && (occurrenceMap[i] || 1) === selectedOccurrence);
                    // Picking words to mark picks a word like c'est, I'm or l'envers whole, not its parts
                    const isPartMarked = markMode && !!cleanedWord && marked.has(cleanedWord.toLowerCase());
                    const partColor = isPartSelected || isDragged(i) || isPartMarked
                      ? Colors.primary
                      : isElisionIgnored
                      ? Colors.textMuted
                      : highlightNewWords
                      ? (partEntry ? Colors.textMuted : Colors.text)
                      : (showMasteryLevelColors && partEntry?.masteryLevel)
                        ? getMasteryLevelColor(partEntry.masteryLevel)
                        : Colors.text;
                    const displayPart = displayParts[pi] || part;
                    return (
                      <Text
                        key={pi}
                        onPress={() => isElidedStart && !markMode
                          ? handleWordPress(part, text, lineIndex, startOccurrence)
                          : handleWordPress(word, text, lineIndex, occurrenceMap[i] || 1)}
                        onLongPress={() => setHeldLine(lineIndex)}
                        style={{
                          color: partColor,
                          fontWeight: isPartActiveOccurrence ? '700' : '400',
                          fontSize,
                          lineHeight: fontSize * 1.6,
                        }}
                      >
                        {displayPart}
                      </Text>
                    );
                  })}
                  {trailing}
                </Text>
              </View>
            );
          }

          // Standard rendering for non-elision words
          const wordEntry = cleanedWord ? findSavedEntry(cleanedWord) ?? null : null;

          const isSelected = selectedWord && cleanedWord.toLowerCase() === selectedWord.toLowerCase();
          const isActiveOccurrence = isSelected && lineIndex === selectedLineIndex && (occurrenceMap[i] || 1) === selectedOccurrence;

          const wordCtx = wordEntry ? findWordContext(wordEntry, text, occurrenceMap[i] || 1) : null;

          // Known words go without IPA and emoji, unless tapped. A phrase whose words sit apart shows its emoji
          // over its first word only, and each word its own IPA
          const quiet = (quietKnownWords && wordEntry?.masteryLevel === 'Known' && !isActiveOccurrence) || !!split?.part;
          let displayContent = '';
          if (showIpa && split) {
            // Each word of a phrase whose words sit apart shows its own IPA, as any word does
            const ownWord = cleanLyricWord(word);
            const ownEntry = ownWord ? findSavedEntry(ownWord) ?? null : null;
            const ownQuiet = quietKnownWords && ownEntry?.masteryLevel === 'Known' && !isActiveOccurrence;
            if (ownEntry && !ownQuiet) {
              const ownCtx = findWordContext(ownEntry, text, wordOccurrences[i] || 1);
              const ownIpa = formIpa(ownEntry, ownWord) || ownCtx?.ipa || ownEntry.pronunciation;
              if (ownIpa) displayContent = formatIpa(ownIpa, showIpaBrackets);
            }
          } else if (showIpa && wordEntry && !quiet) {
            const ipaValue = formIpa(wordEntry, cleanedWord) || wordCtx?.ipa || wordEntry.pronunciation;
            if (ipaValue) {
              displayContent = formatIpa(ipaValue, showIpaBrackets);
            }
          }

          const contextEmoji = wordCtx?.emoji;
          const globalEmoji = wordEntry?.emoji;
          let effectiveEmoji = contextEmoji || globalEmoji;
          let shouldShowEmoji = showEmoji && wordEntry && !quiet && effectiveEmoji &&
            effectiveEmoji !== getFlagForLanguage(wordEntry.language);

          const isIgnored = !!cleanedWord && isIgnoredWord(cleanedWord, song?.originalLanguages?.[0] || 'unknown');
          // Ignored words show their IPA too, so the lyrics read the same all through
          const ipaKept = isIgnored;

          const compoundParts = !wordEntry && !isIgnored && isGermanSong && cleanedWord && !isPhrase
            ? getCompoundParts(cleanedWord, compoundSplits, knownGermanWords)
            : null;
          const compoundStart = compoundParts ? word.indexOf(cleanedWord) : -1;
          const compoundEntries = compoundParts?.map((part) => findWordEntry(part.lemma));

          // A split compound shows its parts' IPA joined, e.g. Liebesbrief -> /ˈliːbəsbʁiːf/,
          if (showIpa && compoundParts && compoundEntries) {
            const compoundIpa = joinCompoundIpa(
              compoundParts,
              compoundEntries.map((entry) => entry && firstIpa(findWordContext(entry, text)?.ipa || entry.pronunciation))
            );
            if (compoundIpa) displayContent = formatIpa(compoundIpa, showIpaBrackets);
          }

          // and its parts' emojis side by side, e.g. Liebesbrief -> 💕✉️ (parts without one are skipped)
          if (showEmoji && compoundParts && compoundEntries) {
            const compoundEmoji = compoundEntries
              .map((entry) => {
                const emoji = entry && (findWordContext(entry, text)?.emoji || entry.emoji);
                return emoji && emoji !== getFlagForLanguage(entry.language) ? emoji : '';
              })
              .join('');
            if (compoundEmoji) {
              effectiveEmoji = compoundEmoji;
              shouldShowEmoji = true;
            }
          }

          // A new word shows the IPA preloaded for it, in white like any word not saved, without saving it
          if (showIpa && !displayContent && !wordEntry && (!isIgnored || ipaKept) && !split && !isPhrase && cleanedWord) {
            const preloaded = getPreloadedIpa(song?.originalLanguages?.[0], cleanedWord);
            if (preloaded) displayContent = formatIpa(preloaded, showIpaBrackets);
          }

          const gap = !compoundParts && !split ? gapEntry(cleanedWord) : undefined;
          if (gap) {
            const isGapSelected = isActiveOccurrence;
            return (
              <View key={i} style={{ alignItems: 'center' }}>
                <View style={styles.annotationSpace} />
                <Text
                  onPress={() => {
                    setGapTarget({ entryId: gap.id, lineIndex, occurrence: occurrenceMap[i] || 1 });
                    handleWordPress(word, text, lineIndex, occurrenceMap[i] || 1);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Gap to fill in"
                  style={[styles.gap, isGapSelected && styles.gapSelected, { fontSize, lineHeight: fontSize * 1.6 }]}
                >
                  {GAP}
                </Text>
              </View>
            );
          }

          const edgePunctuation = splitEdgePunctuation(word);
          // A saved Russian or Ukrainian word shows its stress from its IPA, e.g. любо́вь
          const stressIpa = firstIpa((wordEntry && formIpa(wordEntry, cleanedWord)) || wordCtx?.ipa || wordEntry?.pronunciation);
          const stressedWord = isStressSong && showIpa && stressIpa && wordEntry &&
            removeStressMarks(cleanedWord.toLowerCase()) === removeStressMarks(wordEntry.word.toLowerCase())
            ? addStressMark(edgePunctuation.core, stressIpa)
            : edgePunctuation.core;
          const isMarked = markMode && !!cleanedWord && marked.has(cleanedWord.toLowerCase());
          const wordColor = isSelected || isDragged(i) || isMarked
            ? Colors.primary
            : isIgnored
              ? Colors.textMuted
              : highlightNewWords
              // Only the words left to learn stand out
              ? (wordEntry ? Colors.textMuted : Colors.text)
              : (showMasteryLevelColors && wordEntry?.masteryLevel)
              ? getMasteryLevelColor(wordEntry.masteryLevel)
              : Colors.text;

          // A phrase written apart, e.g. viel zu viel, with no IPA of its own shows each of its words' own IPA
          if (isPhrase && showIpa && !split && !displayContent && !compoundParts) {
            const phraseWordList = edgePunctuation.core.split(/\s+/).filter(Boolean);
            const ownIpas = phraseWordList.map((pw) => {
              const ownWord = cleanLyricWord(pw);
              const ownEntry = ownWord ? findSavedEntry(ownWord) ?? null : null;
              if (!ownEntry || (quietKnownWords && ownEntry.masteryLevel === 'Known' && !isActiveOccurrence)) return '';
              const ownIpa = formIpa(ownEntry, ownWord) || findWordContext(ownEntry, text)?.ipa || ownEntry.pronunciation;
              return ownIpa ? formatIpa(ownIpa, showIpaBrackets) : '';
            });
            if (ownIpas.some(Boolean)) {
              const phraseStyle = [
                {
                  color: wordColor,
                  fontWeight: isActiveOccurrence ? ('700' as const) : ('400' as const),
                  fontSize,
                  lineHeight: fontSize * 1.6,
                },
                !!wordEntry && {
                  textDecorationLine: 'underline' as const,
                  textDecorationStyle: 'dotted' as const,
                  textDecorationColor: wordColor,
                },
              ];
              return (
                <View key={i} onLayout={onWordLayout(i)} style={{ flexDirection: 'row' }}>
                  {phraseWordList.map((pw, pi) => (
                    <View key={pi} style={{ alignItems: 'center' }}>
                      <View style={styles.annotationSpace}>
                        {!!ownIpas[pi] && <Text style={styles.wordAnnotation}>{ownIpas[pi]}</Text>}
                      </View>
                      <Text
                        onPress={() => handleWordPress(word, text, lineIndex, occurrenceMap[i] || 1, single)}
                        onLongPress={() => setHeldLine(lineIndex)}
                        style={{ fontSize, lineHeight: fontSize * 1.6, color: Colors.text }}
                      >
                        {pi === 0 && renderEdge(edgePunctuation.leading, wordColor, fontSize)}
                        <Text style={phraseStyle}>{pw}</Text>
                        {pi < phraseWordList.length - 1 && <Text style={phraseStyle}>{' '}</Text>}
                        {pi === phraseWordList.length - 1 && renderEdge(edgePunctuation.trailing, wordColor, fontSize)}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            }
          }

          // Japanese characters keep no empty space above them, so a line with nothing to show
          // above it stays as tight as the lyrics themselves
          const isLoadingWord = !displayContent && !!cleanedWord && (
            loadingWords.has(loadingWordKey(cleanedWord, lineIndex, occurrenceMap[i] || 1)) ||
            (showIpa && !wordEntry && (!isIgnored || ipaKept) && !split && !isPhrase &&
              preloadPendingRef.current.has(preloadKey(song?.originalLanguages?.[0], cleanedWord))));
          const meaningText = showMeaning && wordEntry && !quiet ? meaningAbove(wordEntry, wordCtx, fittingMeaning(wordEntry, wordCtx, lineIndex)) : '';
          const hasAnnotation = !!shouldShowEmoji || !!displayContent || !!meaningText || isLoadingWord;
          const keepAnnotationSpace = hasAnnotation || !isCjkWord(word);

          return (
            <View key={i} onLayout={onWordLayout(i)} style={{ alignItems: 'center' }}>
              {keepAnnotationSpace && (
                <View style={styles.annotationSpace}>
                  {shouldShowEmoji && (
                    <Text style={styles.wordAnnotation}>
                      {effectiveEmoji}
                    </Text>
                  )}
                  {(!!meaningText || !!displayContent) && (
                    <View style={[styles.annotationStack, { paddingHorizontal: annotationGap }]}>
                      {!!meaningText && (
                        <Text style={styles.wordAnnotation}>
                          {meaningText}
                        </Text>
                      )}
                      {!!displayContent && (
                        <Text style={styles.wordAnnotation}>
                          {displayContent}
                        </Text>
                      )}
                    </View>
                  )}
                  {isLoadingWord && (
                    <ActivityIndicator size={10} color={Colors.textSecondary} accessibilityLabel="Loading IPA" />
                  )}
                </View>
              )}
              <Text
                onPress={() => handleWordPress(split ? split.phrase : word, text, lineIndex, occurrenceMap[i] || 1, single)}
                onLongPress={() => setHeldLine(lineIndex)}
                style={{
                  fontSize,
                  lineHeight: fontSize * 1.6,
                  color: Colors.text,
                  fontWeight: isActiveOccurrence ? '700' : '400',
                }}
              >
                {compoundParts && compoundStart >= 0 ? (
                  <>
                    {word.slice(0, compoundStart)}
                    {compoundParts.map((part, pi) => {
                      const partEntry = compoundEntries?.[pi];
                      const partColor = isSelected || isDragged(i) || isMarked
                        ? Colors.primary
                        : highlightNewWords
                        ? (partEntry ? Colors.textMuted : Colors.text)
                        : (showMasteryLevelColors && partEntry?.masteryLevel)
                          ? getMasteryLevelColor(partEntry.masteryLevel)
                          : Colors.text;
                      return (
                        <React.Fragment key={pi}>
                          <Text
                            style={{
                              color: partColor,
                              fontWeight: isActiveOccurrence ? '700' : '400',
                              fontSize,
                              lineHeight: fontSize * 1.6,
                            }}
                          >
                            {part.text}{part.after}
                          </Text>
                        </React.Fragment>
                      );
                    })}
                    {word.slice(compoundStart + cleanedWord.length)}
                  </>
                ) : (
                  // The punctuation around the word takes its color, e.g. the brackets in (Amore) and the question mark in mich?
                  <>
                    {renderEdge(edgePunctuation.leading, wordColor, fontSize)}
                    <Text
                      style={[
                        {
                          color: wordColor,
                          fontWeight: isActiveOccurrence ? '700' : '400',
                          fontSize,
                          lineHeight: fontSize * 1.6,
                        },
                        // A saved phrase, from this song or another, reads as one: tout à fait
                        isPhrase && !!wordEntry && {
                          textDecorationLine: 'underline',
                          textDecorationStyle: 'dotted',
                          textDecorationColor: wordColor,
                        },
                      ]}
                    >
                      {stressedWord}
                    </Text>
                    {renderEdge(edgePunctuation.trailing, wordColor, fontSize)}
                  </>
                )}
              </Text>
            </View>
          );
        })}
      </View>
      </GestureDetector>
    );
  }, [findWordEntry, findSavedEntry, hasFrenchLanguage, hasItalianLanguage, isRtlSong, words, isIgnoredWord, compoundSplits, knownGermanWords, isGermanSong, song?.originalLanguages, song?.id, isStressSong, selectedWord, selectedLineIndex, selectedOccurrence, showIpa, showIpaBrackets, showEmoji, showMeaning, fontSize, showMasteryLevelColors, findWordContext, gapEntry, wideWordSpacing, annotationGap, highlightNewWords, quietKnownWords, dragRange, savedSplitPhrases, loadingWords, markMode, marked, lines]);

  // Line shown in the settings preview: the selected line, otherwise the
  // shortest-enough line with the most saved words that have an emoji or IPA
  const previewLineIndex = useMemo(() => {
    if (selectedLineIndex !== null && lines[selectedLineIndex]?.original.trim()) {
      return selectedLineIndex;
    }
    let best: { index: number; score: number; fits: boolean } | null = null;
    lines.forEach((line, index) => {
      const lineWords = line.original.split(/\s+/).filter((w) => removeSpecialChars(w));
      if (lineWords.length === 0) return;
      const score = lineWords.filter((w) => {
        const entry = findWordEntry(removeSpecialChars(w));
        return !!entry && !!(
          entry.emoji || entry.pronunciation || entry.contexts?.some((c) => c.emoji || c.ipa)
        );
      }).length;
      const fits = lineWords.length <= PREVIEW_MAX_WORDS;
      if (score === 0) return;
      if (!best || (fits && !best.fits) || (fits === best.fits && score > best.score)) {
        best = { index, score, fits };
      }
    });
    return (best as { index: number } | null)?.index ?? null;
  }, [lines, selectedLineIndex, findWordEntry]);

  // Get translation line for the selected line, from the languages shown
  const translationLineOf = (languages?: string[]) =>
    selectedLineIndex !== null && lines[selectedLineIndex]
      ? lines[selectedLineIndex].translations
          .filter((tl) => tl.show && !isRomanized(tl.language) && (!languages || languages.includes(tl.key)))
          .map((tl) => tl.text)
          .join(' / ')
      : undefined;
  const shownTranslationLine = translationLineOf(localSelectedLanguages);
  // A looked-up word's context keeps the line's translation even with translations turned off
  const selectedTranslationLine = localSelectedLanguages.length ? shownTranslationLine : translationLineOf();

  // A tapped new word is saved as Seen, as Look up and Save would: with Wiktionary's first IPA, its
  // recordings, and the meaning found in the line's translation (or else the first) for this line.
  // The saved word's card then quizzes that meaning. A word tapped away from before Wiktionary
  // answers keeps loading and is saved once it does; a phrase Wiktionary doesn't have isn't saved.
  const songLanguage = song?.originalLanguages?.[0];
  // Words are ignored per song language, like on the new word card
  const ignoreLanguage = songLanguage || 'unknown';
  const selectedWordSaved = !!selectedWord && !!findSavedEntry(selectedWord);
  const selectedWordIgnored = !!selectedWord && !!songLanguage && isIgnoredWord(selectedWord, songLanguage);
  // The tapped word whose meaning and IPA are still being fetched, so its card shows them loading
  const [fetchingWord, setFetchingWord] = useState<string | null>(null);
  // The word a tap just saved, whose card keeps showing Saved until another word is tapped or the card closes
  const [justSavedWord, setJustSavedWord] = useState<string | null>(null);
  useEffect(() => {
    setJustSavedWord(null);
  }, [selectedWord]);
  useEffect(() => {
    if (!selectedWord || selectedWordSaved || selectedWordIgnored || !songLanguage || !song) return;
    const job = { word: selectedWord, cancelled: false };
    wordFetchRef.current = job;
    const loadingKey = loadingWordKey(selectedWord, selectedLineIndex, selectedOccurrence);
    setLoadingWords((keys) => new Set(keys).add(loadingKey));
    const doneLoading = () => setLoadingWords((keys) => {
      if (!keys.has(loadingKey)) return keys;
      const next = new Set(keys);
      next.delete(loadingKey);
      return next;
    });
    const stillSelected = () => selectedWordRef.current === job.word;
    setFetchingWord(selectedWord);
    // A word Wiktionary doesn't have is saved as what it's about: a Korean word without its particles,
    // e.g. 너 for 너를, or a Spanish or Portuguese verb without its pronouns, e.g. amar for amarte
    const baseWord = (isKoreanSong ? getKoreanStem(selectedWord, { loose: true }) : null) ??
      getRomanceBaseWord(selectedWord, song.originalLanguages, { loose: true });
    // A song in several languages, e.g. German then French, has each word looked up in the first language that
    // has it, and the word is saved in that language
    let wordLanguage = songLanguage;
    const lookUp = (word: string, language = wordLanguage) => {
      const cached = preloaded(word, language);
      if (cached) return Promise.resolve(cached);
      return Promise.all([getWiktionaryDefinitions(word, language), getWiktionaryPronunciation(word, language)])
        .then(([definitions, pronunciation]) => ({ word, definitions, pronunciation }));
    };
    // What Learn preloaded for the word is used as it is, not asked of Wiktionary again
    const preloaded = (word: string, language?: string) => {
      const cached = getPreloadedWord(songLanguage, word);
      if (!cached || (!cached.ipa && !cached.definitions?.length)) return undefined;
      if (language && !isSameLanguage(cached.language ?? songLanguage, language)) return undefined;
      return {
        word,
        definitions: cached.definitions?.length ? cached.definitions : null,
        // No recordings cached: the saved word's card fetches them, as when Wiktionary gave no answer
        pronunciation: { ipa: cached.ipa ? [cached.ipa] : [], audio: undefined as unknown as [] },
        language: cached.language ?? songLanguage,
      };
    };
    const lookUpInSongLanguages = async (word: string) => {
      const cached = preloaded(word);
      if (cached) {
        wordLanguage = cached.language;
        return cached;
      }
      const languages = song.originalLanguages?.length ? song.originalLanguages : [songLanguage];
      let first: Awaited<ReturnType<typeof lookUp>> | undefined;
      for (const language of languages) {
        const found = await lookUp(word, language);
        first ??= found;
        if (found.definitions?.length || found.pronunciation?.ipa.length) {
          wordLanguage = language;
          return found;
        }
        if (job.cancelled) break;
      }
      return first!;
    };
    // A phrase whose words sit apart isn't a page on Wiktionary, e.g. hört … auf
    const firstLookUp = isSplitPhrase(selectedWord)
      ? Promise.resolve({ word: selectedWord, definitions: null, pronunciation: null })
      : lookUpInSongLanguages(selectedWord);
    // The phrase as Wiktionary has it, which it's saved as, with the phrase as written as a form
    let phraseForm: string | undefined;
    // A capitalized word opening a line is capitalized by the line, e.g. Dann, and one Wiktionary has
    // no entry for as written is saved lowercase; otherwise it's saved as written, e.g. a German noun
    const lowered = selectedWord.toLowerCase();
    const opensLine = !!selectedLine && selectedLine.replace(/^[^\p{L}\p{N}]+/u, '').startsWith(selectedWord) && selectedOccurrence === 1;
    firstLookUp.then(async (found) => {
      // The lowercase page is only asked about when it could be used: for a word opening a line, or one with no meaning
      if (lowered !== selectedWord && !isSplitPhrase(selectedWord) && !/\s/.test(selectedWord) && (opensLine || !found.definitions?.length)) {
        const asLower = await lookUp(lowered);
        if (asLower.definitions?.length) found = asLower;
      }
      if (baseWord && !found.definitions?.length) {
        const stemFound = await lookUp(baseWord);
        if (stemFound.definitions?.length) found = stemFound;
      }
      // A German word with its ending dropped, e.g. kauf' for kaufe or kaufen, or find for finde, is saved
      // as written with the meaning of its full form and that form's IPA without the ending
      if (isGermanLanguage([wordLanguage]) && !found.definitions?.length) {
        for (const candidate of germanFullForms(selectedWord)) {
          if (job.cancelled) break;
          const full = await lookUp(candidate);
          if (!full.definitions?.length) continue;
          const ipa = [full.pronunciation?.ipa[0], ...(full.pronunciation?.ipa.slice(1) ?? [])]
            .map((i) => (i ? clippedFormIpa(selectedWord, i) : undefined)).find(Boolean);
          found = {
            word: selectedWord,
            definitions: full.definitions,
            pronunciation: { ...(full.pronunciation ?? { audio: [] }), ipa: ipa ? [ipa] : [], audio: [] },
          };
          break;
        }
      }
      // A phrase whose words sit apart, or a German verb with its particle, as Wiktionary has it:
      // aufhören for hört … auf or "hört auf", "turn off" for turn … off
      if (!found.definitions?.length && /\s/.test(selectedWord)) {
        for (const candidate of await phraseLookupWords(selectedWord, wordLanguage, isGermanLanguage([wordLanguage]))) {
          if (job.cancelled) break;
          const phraseFound = await lookUp(candidate);
          if (phraseFound.definitions?.length) {
            found = phraseFound;
            phraseForm = selectedWord;
            break;
          }
        }
      }
      return found;
    }).then(({ word: savedWord, definitions, pronunciation }) => {
      doneLoading();
      if (job.cancelled) return;
      setFetchingWord((word) => (word === job.word ? null : word));
      // Saved or ignored from elsewhere while it loaded in the background
      if (!stillSelected()) {
        const { words: savedWords, ignoredWords: ignored } = useStore.getState();
        if (findSavedWord(savedWords, savedWord, wordLanguage) || isWordIgnored(ignored, job.word, songLanguage)) return;
      }
      // A phrase of two or more words, e.g. "give up", is saved only when Wiktionary has it; otherwise
      // its card stays unsaved for the NEW badge to save it
      if (/\s/.test(savedWord.trim()) && !definitions?.length) return;
      const answer = definitions?.length ? pickDefinition(definitions, selectedTranslationLine) ?? definitions[0].text : undefined;
      const context: WordContext = {
        context: selectedLine ?? '',
        definition: answer,
        partOfSpeech: answer ? normalizePartOfSpeech(definitions!.find((d) => d.text === answer)?.partOfSpeech) : undefined,
        songId: song.id,
        songName: song.songName,
        translation: selectedTranslationLine || undefined,
        fromSong: !!selectedLine,
        occurrence: selectedOccurrence,
      };
      // Without Wiktionary's answer the saved word's card fetches the IPA and recordings itself
      if (stillSelected()) autoSavedWordRef.current = savedWord;
      const { updateWordEntry } = useStore.getState();
      const addForm = async () => {
        const entry = phraseForm && findSavedWord(useStore.getState().words, savedWord, wordLanguage);
        if (entry && phraseForm) await updateWordEntry(entry.id, { forms: [...(entry.forms ?? []), phraseForm] });
      };
      // A phrase's dictionary form saved before, e.g. aufhören, takes it as another form, keeping its level
      const saved = phraseForm ? findSavedWord(useStore.getState().words, savedWord, wordLanguage) : undefined;
      if (saved) {
        autoSavedWordRef.current = null;
        void updateWordEntry(saved.id, { contexts: [...saved.contexts, context] }).then(addForm).then(() => stillSelected() && setJustSavedWord(savedWord));
        return;
      }
      void addOrUpdateWord(savedWord, wordLanguage, pronunciation?.ipa[0], [context], 'Seen', pronunciation?.audio)
        .then(addForm)
        .then(() => stillSelected() && setJustSavedWord(savedWord));
    }, doneLoading);
    // Tapping another word (or closing the card) lets it keep loading; the same word tapped again,
    // ignored or saved meanwhile stops it
    return () => {
      if (selectedWordRef.current === job.word) job.cancelled = true;
      if (job.cancelled) doneLoading();
      if (wordFetchRef.current === job) wordFetchRef.current = null;
      setFetchingWord(null);
    };
    // Saved once per tap, with the line it was tapped in
  }, [selectedWord, selectedWordSaved, selectedWordIgnored, songLanguage, selectedLineIndex, selectedOccurrence]);

  // Unsaved words in the lines on screen (and a screen's worth around them) have their IPA preloaded, so it shows
  // above them like a saved word's. Only the lookup is kept for the session: nothing is saved. Words are asked
  // five at a time in reading order, each once; saved, ignored and number words are left out
  const preloadQueueRef = useRef<{ key: string; word: string; lines: number[]; translation?: string }[]>([]);
  const preloadActiveRef = useRef(0);
  const preloadPumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preloadRequestedRef = useRef(new Set<string>());
  const preloadDirtyRef = useRef(new Set<number>());
  const preloadFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preloadAliveRef = useRef(true);
  useEffect(() => {
    preloadAliveRef.current = true;
    return () => {
      preloadAliveRef.current = false;
      if (preloadFlushRef.current) clearTimeout(preloadFlushRef.current);
      if (preloadPumpTimerRef.current) clearTimeout(preloadPumpTimerRef.current);
    };
  }, []);
  const preloadSongLanguage = song?.originalLanguages?.[0];
  // Words looked up in earlier sessions show at once, and aren't asked again
  const [preloadCacheLoaded, setPreloadCacheLoaded] = useState(false);
  useEffect(() => {
    void loadPreloadedIpa().then(() => {
      if (!preloadAliveRef.current) return;
      setPreloadCacheLoaded(true);
      // Lines drawn before the cache was read
      setPreloadedLines((prev) => Object.fromEntries(Object.keys(prev).concat(lines.map((_, i) => String(i))).map((i) => [i, (prev[+i] ?? 0) + 1])));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!preloadCacheLoaded || !showIpa || !visibleRange || !preloadSongLanguage || !song) return;
    const language = preloadSongLanguage;
    const candidates = new Map<string, { key: string; word: string; lines: number[]; translation?: string }>();
    // Top to bottom, and left to right within a line
    const order = lines.map((_, i) => i).filter((i) => i >= visibleRange.from && i <= visibleRange.to);
    for (const lineIndex of order) {
      for (const token of splitLyricTokens(lines[lineIndex].original)) {
        if (!token.trim()) continue;
        const word = cleanLyricWord(token);
        if (!word || !isLyricWord(word) || /\p{N}/u.test(word) || word.includes(' ') || isCjkWord(word)) continue;
        // Elided words, e.g. l'essence, show their parts' IPA instead
        if ((hasFrenchLanguage || hasItalianLanguage) && hasContractedPrefix(word)) continue;
        if (findSavedEntry(word)) continue;
        const key = preloadKey(language, word);
        if (hasPreloadedIpa(key) || preloadRequestedRef.current.has(key)) continue;
        const known = candidates.get(key);
        if (known) {
          if (!known.lines.includes(lineIndex)) known.lines.push(lineIndex);
        } else {
          // The line's translation, to pick the meaning it's about
          const translation = lines[lineIndex].translations
            .filter((tl) => !isRomanized(tl.language) && tl.text)
            .map((tl) => tl.text)
            .join(' / ');
          candidates.set(key, { key, word, lines: [lineIndex], translation: translation || undefined });
        }
      }
    }
    // What's on screen now goes first, ahead of words queued for lines scrolled away from
    preloadQueueRef.current = [...candidates.values()];
    const flush = () => {
      preloadFlushRef.current = null;
      if (!preloadAliveRef.current || preloadDirtyRef.current.size === 0) return;
      const dirty = [...preloadDirtyRef.current];
      preloadDirtyRef.current.clear();
      setPreloadedLines((prev) => {
        const next = { ...prev };
        for (const index of dirty) next[index] = (next[index] ?? 0) + 1;
        return next;
      });
    };
    if (preloadDirtyRef.current.size && !preloadFlushRef.current) preloadFlushRef.current = setTimeout(flush, 50);
    // A song in several languages, e.g. German then French, has each word looked up in the first language that has it
    const languages = song.originalLanguages?.length ? song.originalLanguages : [language];
    const lookUpIn = async (word: string, wordLanguage: string, translation: string | undefined, fallbacks: boolean): Promise<PreloadedWord> => {
      const first = async (candidate: string) => (await getWiktionaryPronunciation(candidate, wordLanguage))?.ipa.find(Boolean);
      const [direct, definitions] = await Promise.all([
        first(word),
        getWiktionaryDefinitions(word, wordLanguage).catch(() => null),
      ]);
      let ipa = direct;
      // The slower guesses only when no language had the word as written
      if (fallbacks && !ipa && isGermanLanguage([wordLanguage])) {
        for (const full of germanFullForms(word)) {
          const fullIpa = await first(full);
          const elided = fullIpa ? clippedFormIpa(word, fullIpa) : undefined;
          if (elided) { ipa = elided; break; }
        }
      }
      if (fallbacks && !ipa) {
        // A Korean word without its particles or a Spanish or Portuguese verb without its pronouns, as a tapped one
        const base = (isKoreanLanguage([wordLanguage]) ? getKoreanStem(word, { loose: true }) : null) ??
          getRomanceBaseWord(word, [wordLanguage], { loose: true });
        if (base && base !== word) ipa = await first(base);
      }
      // The meaning that appears in the line's translation, else the first
      const definition = definitions?.length ? pickDefinition(definitions, translation) ?? definitions[0].text : undefined;
      const partOfSpeech = definition ? normalizePartOfSpeech(definitions!.find((d) => d.text === definition)?.partOfSpeech) : undefined;
      return { ipa: ipa ?? '', definition, partOfSpeech, language: wordLanguage, definitions: definitions?.length ? definitions : undefined };
    };
    const lookUp = async (word: string, translation?: string): Promise<PreloadedWord> => {
      let firstFound: PreloadedWord | undefined;
      for (const fallbacks of [false, true]) {
        for (const wordLanguage of languages) {
          const found = await lookUpIn(word, wordLanguage, translation, fallbacks);
          firstFound ??= found;
          if (found.ipa || found.definition) return found;
        }
      }
      return firstFound ?? { ipa: '' };
    };
    const flushSoon = (delay: number) => {
      if (!preloadFlushRef.current) preloadFlushRef.current = setTimeout(flush, delay);
    };
    // Up to five words are looked up at once, in reading order, each starting a moment after the one before: a word's
    // spinner pops up as its lookup starts, and turns into its IPA when it's done
    const pump = () => {
      if (!preloadAliveRef.current || preloadPumpTimerRef.current) return;
      if (preloadActiveRef.current >= PRELOAD_BATCH) return;
      let job: { key: string; word: string; lines: number[]; translation?: string } | undefined;
      while (!job && preloadQueueRef.current.length) {
        const next = preloadQueueRef.current.shift()!;
        if (!preloadRequestedRef.current.has(next.key)) job = next;
      }
      if (!job) return;
      const started = job;
      preloadRequestedRef.current.add(started.key);
      preloadActiveRef.current++;
      preloadPendingRef.current.add(started.key);
      started.lines.forEach((i) => preloadDirtyRef.current.add(i));
      flushSoon(20);
      lookUp(started.word, started.translation).catch((): PreloadedWord => ({ ipa: '' })).then(({ ipa, definition, partOfSpeech, language, definitions }) => {
        // A failed or empty lookup is left empty, and not asked again this session
        setPreloadedWord(started.key, { ipa, definition, partOfSpeech, language, definitions });
        preloadPendingRef.current.delete(started.key);
        preloadActiveRef.current--;
        // The spinner goes even when there's no IPA
        started.lines.forEach((i) => preloadDirtyRef.current.add(i));
        if (ipa) lines.forEach((l, i) => { if (!started.lines.includes(i) && l.original.includes(started.word)) preloadDirtyRef.current.add(i); });
        flushSoon(60);
        pump();
      });
      preloadPumpTimerRef.current = setTimeout(() => {
        preloadPumpTimerRef.current = null;
        pump();
      }, PRELOAD_STAGGER_MS);
    };
    pump();
    // Unsaved words, ignored words and settings are read when the lines come into view or any of them changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadCacheLoaded, visibleRange, lines, showIpa, preloadSongLanguage, ignoredWords, words]);

  // A saved word tapped without any IPA, e.g. saved before IPA was fetched, gets it from Wiktionary
  // (including IPA put together from its etymology or inflected form). Only an empty IPA is filled
  const selectedWordEntry0 = selectedWord ? findSavedEntry(selectedWord) : null;
  const savedNeedsIpa = !!selectedWordEntry0 && !selectedWordEntry0.pronunciation?.trim() &&
    !selectedWordEntry0.contexts?.some((c) => c.ipa?.trim());
  const savedNeedsIpaId = savedNeedsIpa ? selectedWordEntry0!.id : null;
  useEffect(() => {
    if (!savedNeedsIpaId || !selectedWord || !songLanguage) return;
    let cancelled = false;
    const entry = useStore.getState().words.find((w) => w.id === savedNeedsIpaId);
    if (!entry) return;
    const lookupLanguage = entry.language || songLanguage;
    (async () => {
      const first = async (word: string) => (await getWiktionaryPronunciation(word, lookupLanguage))?.ipa.find(Boolean);
      let ipa = await first(entry.word);
      // A German word with its ending dropped, e.g. kauf' for kaufe or kaufen, or find for finde
      if (!ipa && lookupLanguage.toLowerCase().startsWith('german')) {
        for (const candidate of germanFullForms(entry.word)) {
          const full = await first(candidate);
          const elided = full ? clippedFormIpa(entry.word, full) : undefined;
          if (elided) { ipa = elided; break; }
        }
      }
      if (!ipa && entry.word !== entry.word.toLowerCase()) ipa = await first(entry.word.toLowerCase());
      // A word with no meaning either that the song's other language has, e.g. a French word saved as German in
      // a German and French song, is moved to that language with its IPA
      let movedTo: string | undefined;
      const hasMeaning = !!entry.definitions?.length || !!entry.contexts?.some((c) => c.definition?.trim());
      if (!ipa && !hasMeaning) {
        for (const other of song?.originalLanguages ?? []) {
          if (cancelled) return;
          if (isSameLanguage(other, lookupLanguage)) continue;
          const found = (await getWiktionaryPronunciation(entry.word, other))?.ipa.find(Boolean);
          if (found) { ipa = found; movedTo = other; break; }
        }
      }
      if (cancelled || !ipa) return;
      // Re-read the word: it may have gained an IPA or changed while Wiktionary answered
      const latest = useStore.getState().words.find((w) => w.id === savedNeedsIpaId);
      if (!latest || latest.pronunciation?.trim() || latest.contexts?.some((c) => c.ipa?.trim())) return;
      await useStore.getState().updateWordEntry(latest.id, movedTo ? { pronunciation: ipa, language: movedTo } : { pronunciation: ipa });
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [savedNeedsIpaId, selectedWord, songLanguage]);

  // A phrase whose words sit apart, saved from Look Up with them together, e.g. "hört auf" for hört … auf,
  // takes it as a form, so the line shows it saved
  useEffect(() => {
    if (!selectedWord || !isSplitPhrase(selectedWord) || selectedWordSaved || !songLanguage) return;
    const together = findSavedWord(words, splitPhraseParts(selectedWord).join(' '), songLanguage);
    if (together) void useStore.getState().updateWordEntry(together.id, { forms: [...(together.forms ?? []), selectedWord] });
  }, [words, selectedWord, selectedWordSaved, songLanguage]);

  if (!song) {
    return (
      <ScreenWrapper>
        <EmptyState
          icon="musical-notes-outline"
          title="No lyrics to display"
          message="Add a song in Editor to start practicing and looking up words."
          actionLabel="Go to Editor"
          onAction={() => navigation.navigate('Editor')}
        />
      </ScreenWrapper>
    );
  }

  /* ─── Word panel ──────────────────────────────────────── */
  const selectedWordEntry = selectedWord
    ? findSavedEntry(selectedWord)
    : null;

  // Definitions of the selected word to look for in its line's translation
  const definitionsOf = (entry: WordEntry, line: string, occurrence?: number): string[] =>
    withWordForms(
      [
        // The meaning shown above the word, e.g. "too" when auch is saved as "even"
        selectedLineIndex !== null ? fittingMeaning(entry, findWordContext(entry, line, occurrence) ?? null, selectedLineIndex) : null,
        findWordContext(entry, line, occurrence)?.definition,
        ...(entry.definitions ?? []).map((d) => d.text),
      ].filter((d): d is string => !!d?.trim())
    );

  // A split compound highlights its parts' definitions together, e.g. Liebesbrief -> "love letter"
  const selectedCompoundEntries = !selectedWordEntry && selectedWord && isGermanSong &&
    !isWordIgnored(ignoredWords, selectedWord, song?.originalLanguages?.[0] || 'unknown')
    ? getCompoundParts(selectedWord, compoundSplits, knownGermanWords)
        ?.map((part) => findWordEntry(part.lemma))
        .filter((entry): entry is WordEntry => !!entry)
    : undefined;

  const selectedDefinitions = selectedLine === null
    ? []
    : selectedWordEntry
      ? [definitionsOf(selectedWordEntry, selectedLine, selectedOccurrence)]
      : (selectedCompoundEntries ?? []).map((entry) => definitionsOf(entry, selectedLine));

  // The selected line's translations, as LearnLyricsView keys them
  const selectedLineTranslationCount =
    selectedLineIndex !== null && lines[selectedLineIndex]
      ? lines[selectedLineIndex].translations.filter((tl) => tl.show && !isRomanized(tl.language) && localSelectedLanguages.includes(tl.key)).length
      : 0;
  // The quiz would give itself away when the line's translation is, or was, readable
  const selectedTranslationSeen =
    selectedLineIndex !== null &&
    showTranslations &&
    selectedLineTranslationCount > 0 &&
    (!blurTranslations || reverseLyrics || seenAllTranslations || seenTranslationLines.has(selectedLineIndex));

  // The meaning asked about: the definition saved for this line, otherwise any saved definition
  const quizSense = (entry: WordEntry): { answer: string; partOfSpeech?: PartOfSpeech } | null => {
    const context = selectedLine !== null ? findWordContext(entry, selectedLine, selectedOccurrence) : null;
    if (context?.definition?.trim()) return { answer: context.definition.trim(), partOfSpeech: context.partOfSpeech };
    const other = entry.contexts?.find((c) => c.definition?.trim());
    if (other) return { answer: other.definition!.trim(), partOfSpeech: other.partOfSpeech };
    const legacy = entry.definitions?.find((d) => d.text.trim());
    return legacy ? { answer: legacy.text.trim() } : null;
  };

  const meaningQuiz = (entry: WordEntry) => {
    const sense = quizSense(entry);
    if (!sense) return null;
    // A German compound's parts aren't wrong meanings, e.g. Liebe in Liebesbrief
    const parts = isGermanSong ? getCompoundParts(entry.word, compoundSplits, knownGermanWords)?.map((p) => p.lemma) : undefined;
    return (
      <WordQuiz
        key={`meaning-${entry.id}-${selectedLineIndex}-${selectedOccurrence}`}
        entry={entry}
        kind="meaning"
        audio={false}
        prompt={<>What does <Text style={styles.quizWord}>{entry.word}</Text> mean here?</>}
        build={() => buildMeaningQuiz({ entry, ...sense, songId: song.id, excludeWords: parts }, useStore.getState().words)}
        hidden={selectedTranslationSeen || lookedUpTap === selectedTap}
        alreadyAnswered={answeredMeanings.has(entry.word.toLowerCase())}
        onAnswered={() => {
          setAnsweredMeanings((prev) => new Set(prev).add(entry.word.toLowerCase()));
        }}
        onPendingChange={setMeaningQuizPending}
        onAnsweredChange={setMeaningQuizAnswered}
        showDue
        isWide={isWide}
      />
    );
  };

  const gapWordEntry = gapTarget && selectedWord && gapTarget.lineIndex === selectedLineIndex && gapTarget.occurrence === selectedOccurrence
    ? words.find((w) => w.id === gapTarget.entryId && w.word.toLowerCase() === selectedWord.toLowerCase())
    : undefined;

  const gapPanel = gapWordEntry && selectedLine !== null ? (() => {
    const sense = quizSense(gapWordEntry);
    // The word's line in another song it was saved from, if any
    const otherContext = gapWordEntry.contexts.find(
      (c) => c.songId && c.songId !== song.id && c.context && findWordSpots([c.context], selectedWord!, () => false).length > 0
    );
    const elsewhere = gapElsewhere && !!otherContext;
    const quizLine = elsewhere ? otherContext!.context : selectedLine;
    const quizOccurrence = elsewhere ? 1 : selectedOccurrence;
    // The line with this occurrence of the word blanked out, filled in with the word once answered
    const answered = answeredGaps.has(gapWordEntry.id);
    let seen = 0;
    const gapLine = quizLine.split(/(\s+)/).map((token, i) => {
      if (removeSpecialChars(token).toLowerCase() !== selectedWord!.toLowerCase()) return token;
      seen++;
      if (seen !== quizOccurrence) return token;
      const { leading, core, trailing } = splitEdgePunctuation(token);
      return (
        <React.Fragment key={i}>
          {leading}
          {answered ? <Text style={styles.gapCardAnswer}>{core}</Text> : GAP}
          {trailing}
        </React.Fragment>
      );
    });
    const hint = (elsewhere ? contextTranslation(useStore.getState().songs.find((s) => s.id === otherContext!.songId), otherContext!.context, otherContext!.translation) : shownTranslationLine) || sense?.answer;
    return (
      <View style={[styles.wordCardContainer]}>
        <View style={[styles.gapCard, isWide && styles.gapCardWide]}>
          <View style={styles.gapCardHeader}>
            <Text style={styles.gapCardTitle}>{drillingLine ? 'Rebuild the line' : 'Fill in the gap'}</Text>
            <View style={styles.gapCardTools}>
              {otherContext && (
                <TouchableOpacity
                  onPress={() => setGapElsewhere(!elsewhere)}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={elsewhere ? 'Back to this song' : 'Try it in another song'}
                >
                  <Ionicons name={elsewhere ? 'musical-note' : 'musical-notes-outline'} size={20} color={elsewhere ? Colors.primaryLight : Colors.textSecondary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setDrillingLine(!drillingLine)}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={drillingLine ? 'Back to the gap' : 'Rebuild the whole line'}
              >
                <Ionicons name={drillingLine ? 'arrow-undo-outline' : 'shuffle-outline'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setGapTarget(null);
                  setSelectedWord(null);
                }}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Close gap"
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          {drillingLine ? (
            <LineDrill
              key={`drill-${selectedLineIndex}-${elsewhere}`}
              line={quizLine}
              hint={(elsewhere ? contextTranslation(useStore.getState().songs.find((s) => s.id === otherContext!.songId), otherContext!.context, otherContext!.translation) : shownTranslationLine) || undefined}
            />
          ) : (
            <>
              {elsewhere && <Text style={styles.gapCardSong}>From {otherContext!.songName ?? 'another song'}</Text>}
              <Text style={styles.gapCardLine}>{gapLine}</Text>
              {hint ? <Text style={styles.gapCardHint}>{hint}</Text> : null}
              <WordQuiz
                key={`lyric-${gapWordEntry.id}-${selectedLineIndex}-${selectedOccurrence}-${elsewhere}`}
                entry={gapWordEntry}
                kind="lyric"
                prompt="Which word goes in the gap?"
                build={() => buildLyricQuiz({
                  entry: gapWordEntry,
                  answer: gapWordEntry.word,
                  partOfSpeech: sense?.partOfSpeech,
                  songId: song.id,
                  // Words the line shows can't be what's missing from it
                  excludeWords: [...quizLine.split(/\s+/).map(removeSpecialChars), ...lineWords(quizLine)].filter(Boolean),
                }, useStore.getState().words)}
                onAnswered={() => setAnsweredGaps((prev) => new Set(prev).add(gapWordEntry.id))}
                showDue
                isWide={isWide}
              />
            </>
          )}
        </View>
      </View>
    );
  })() : null;

  const wordCardPanel = (
    selectedWord && selectedWordEntry ? (
      <View style={[styles.wordCardContainer, !isWide && styles.wordCardInSheet]}>
        <WordCard
          inSheet={!isWide}
          item={selectedWordEntry}
          showDelete={false}
          showClose={true}
          onClose={closeWordCard}
          onRemove={(item) => {
            // Closed first, so the word isn't saved again as a new word being tapped
            setSelectedWord(null);
            setRemovedWord({ entry: item });
            void deleteWord(item.id);
          }}
          onIgnore={(item) => {
            // Ignored first, so the word isn't saved again while it stays selected; its card then
            // shows it as ignored, with the button to unignore it, so no toast covers it
            void toggleIgnoredWord(item.word, ignoreLanguage);
            void deleteWord(item.id);
          }}
          source="Learn"
          songId={song.id}
          songName={song.songName}
          artistName={song.artistName}
          lyricsLine={selectedLine ?? undefined}
          translationLine={selectedTranslationLine}
          originalLanguages={song.originalLanguages}
          occurrence={selectedOccurrence}
          quiz={meaningQuiz(selectedWordEntry)}
          quizPending={meaningQuizPending}
          quizAnswered={meaningQuizAnswered}
          justSaved={justSavedWord?.toLowerCase() === selectedWordEntry.word.toLowerCase()}
        />
        {/* Kept for a saved word with an apostrophe (l'envers), to look up and save the part after it */}
        {/['’‘]/.test(selectedWordEntry.word) && (
          <View style={styles.savedAlsoLookUp}>
            <WordTransformButtons
              word={selectedWordEntry.word}
              songId={song.id}
              songName={song.songName}
              artistName={song.artistName}
              lyricsLine={selectedLine ?? undefined}
              translationLine={selectedTranslationLine}
              originalLanguages={song.originalLanguages}
              source="Learn"
              occurrence={selectedOccurrence}
              hideOriginalWord
              compact
            />
          </View>
        )}
      </View>
    ) : selectedWord ? (
      <NewWordCard
        word={selectedWord}
        songId={song.id}
        songName={song.songName}
        artistName={song.artistName}
        lyricsLine={selectedLine ?? undefined}
        translationLine={selectedTranslationLine}
        originalLanguages={song.originalLanguages}
        onClose={closeWordCard}
        isWide={isWide}
        occurrence={selectedOccurrence}
        loading={fetchingWord === selectedWord}
        inSheet={!isWide}
      />
    ) : null);
  const dictationPanel = dictation && lines[dictation.lineIndex] ? (
    <Dictation
      key={dictation.lineIndex}
      line={lines[dictation.lineIndex].original}
      onPlay={() => void spotify.playLine(dictation.lineIndex)}
      onChecked={(checked) => setDictation({ lineIndex: dictation.lineIndex, checked })}
      onClose={() => setDictation(null)}
    />
  ) : null;

  // A German verb's particle at the end of its clause, to select the two as one, e.g. auf for hört in
  // "Wann hört all dieser Schmerz auf?" -> hört … auf (aufhören)
  const separableVerb = (() => {
    if (!isGermanSong || !selectedWord || /\s/.test(selectedWord) || selectedLine === null || selectedLineIndex === null) return null;
    const tokens = splitLyricTokens(selectedLine);
    const lower = selectedWord.toLowerCase();
    let seen = 0;
    const at = tokens.findIndex((token) => cleanLyricWord(token).toLowerCase() === lower && ++seen === selectedOccurrence);
    const verb = at < 0 ? null : germanSeparableVerb(tokens, at);
    if (!verb) return null;
    const line = selectedLine;
    const lineIndex = selectedLineIndex;
    const start = tokens.slice(0, at).join('').length;
    return {
      phrase: verb.phrase,
      onSelect: () => {
        // The word this tap just saved goes, as it means something else here, e.g. hört (hears)
        const autoSaved = autoSavedWordRef.current;
        autoSavedWordRef.current = null;
        if (autoSaved && autoSaved.toLowerCase() === lower) {
          const entry = findSavedEntry(autoSaved);
          if (entry && entry.contexts.length <= 1) void deleteWord(entry.id);
        }
        setDragSelection(null);
        setSelectedWord(verb.phrase);
        setSelectedLine(line);
        setSelectedLineIndex(lineIndex);
        setSelectedOccurrence(phraseOccurrenceAt(line, verb.phrase, start));
      },
    };
  })();

  // The words of a phrase dragged across, while it's selected, to leave some out
  const draggedKept = dragSelection?.words.map((word, index) => ({ word, index })).filter((w) => !dragSelection.dropped.includes(w.index));
  const phraseTrim = dragSelection && draggedKept && dragSelection.lineIndex === selectedLineIndex &&
    selectedWord && joinLineWords(draggedKept).toLowerCase() === selectedWord.toLowerCase() ? {
    words: dragSelection.words,
    dropped: dragSelection.dropped,
    onToggle: (index: number) => {
      const dropped = dragSelection.dropped.includes(index)
        ? dragSelection.dropped.filter((i) => i !== index)
        : [...dragSelection.dropped, index];
      const kept = dragSelection.words.map((word, i) => ({ word, index: i })).filter((w) => !dropped.includes(w.index));
      if (kept.length === 0) return;
      setDragSelection({ ...dragSelection, dropped });
      selectLineWords(kept, dragSelection.line, dragSelection.lineIndex, dragSelection.start);
    },
  } : undefined;
  const splitPhraseHint = separableVerb || phraseTrim
    ? <SplitPhraseHint suggestion={separableVerb ?? undefined} trim={phraseTrim} />
    : null;

  const wordPanel = quizMode ? null : dictationPanel ?? gapPanel ?? (wordCardPanel && (wordSpots.length > 1 || selectedWordEntry || selectedLine?.trim()) ? (
    <View>
      {isWide ? (
        <>
          {wordSpots.length > 1 && (
            <WordSpotStepper
              count={wordSpots.length}
              index={wordSpotIndex}
              onStep={goToWordSpot}
            />
          )}
          {selectedWordEntry && <LemmaMergeHint entry={selectedWordEntry} />}
        </>
      ) : (wordSpots.length > 1 || selectedWordEntry) && (
        // In the sheet, the merge hint and the song's other lines with the word share one row
        <View style={styles.sheetTopRow}>
          {selectedWordEntry && <LemmaMergeHint entry={selectedWordEntry} compact />}
          {wordSpots.length > 1 && (
            <WordSpotStepper
              count={wordSpots.length}
              index={wordSpotIndex}
              onStep={goToWordSpot}
              compact
            />
          )}
        </View>
      )}
      {splitPhraseHint}
      {wordCardPanel}
    </View>
  ) : wordCardPanel);

  // Quiz mode is offered once every word in the song is saved (or ignored)
  const canQuizSong = !lyricQuiz && contentLines.length > 0 && !!wordProgress && wordProgress.total > 0 && wordProgress.newWords === 0;
  const toggleQuizMode = () => {
    if (quizMode) {
      setQuizMode(null);
      return;
    }
    // Starts where Learn was: the tapped word's line, the line shown 1 by 1, or the found line
    const start = [selectedLineIndex, lineByLine, foundLine].find((i) => i !== null && contentLines.includes(i));
    setSelectedWord(null);
    setDictation(null);
    autoLineByLine.current = false;
    setLineByLine(null);
    setQuizMode({ startLine: start ?? contentLines[0] });
  };

  // The song's due words, to review from the Spotify bar while it plays
  const [songReview, setSongReview] = useState<ReviewItem[] | null>(null);
  const songReviewCount = useMemo(() => (song ? Math.min(songDueWords(song.id, words).length, SONG_REVIEW_SIZE) : 0), [song, words]);
  const lineStep = lineByLine !== null ? contentLines.indexOf(lineByLine) : -1;
  const stepLine = (delta: number) => {
    const next = contentLines[lineStep + delta];
    if (next === undefined) return;
    // Stepping keeps 1 by 1 on after the card closes
    autoLineByLine.current = false;
    setSelectedWord(null);
    setLineByLine(next);
  };
  // Swipe the chip row up to fold it away under the title, swipe the title down to bring it back
  const [actionBarCollapsed, setActionBarCollapsed] = usePersistedState('@lyricsionary_learn_actionbar_collapsed', false, (v): v is boolean => typeof v === 'boolean');
  const [spotifyBarHidden, setSpotifyBarHidden] = usePersistedState('@lyricsionary_spotify_bar_hidden', false, (v): v is boolean => typeof v === 'boolean');
  // Swiping down brings back the nearest hidden bar: the chip row, then the Spotify bar
  const revealMore = () => {
    if (actionBarCollapsed) setActionBarCollapsed(false);
    else if (spotifyBarHidden) setSpotifyBarHidden(false);
  };
  const headerSwipe = useSwipe(() => {}, revealMore);
  const markBar = (
    <View style={styles.markBar}>
      <TouchableOpacity onPress={exitMarkMode} style={styles.markClose} accessibilityRole="button" accessibilityLabel="Stop picking words">
        <Ionicons name="close" size={22} color={Colors.textSecondary} />
      </TouchableOpacity>
      <Text style={styles.markCount} numberOfLines={1}>
        {marked.size === 0 ? 'Pick words' : `${marked.size} picked`}
      </Text>
      <TouchableOpacity
        onPress={() => void ignorePicked()}
        disabled={marked.size === 0}
        style={[styles.markButton, styles.ignoreButton, marked.size === 0 && { opacity: 0.4 }]}
        accessibilityRole="button"
        accessibilityLabel="Ignore picked words"
      >
        <Ionicons name="eye-off-outline" size={18} color={Colors.textSecondary} />
        <Text style={[styles.markButtonText, { color: Colors.textSecondary }]}>Ignore</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => void markPickedKnown()}
        disabled={marked.size === 0}
        style={[styles.markButton, marked.size === 0 && { opacity: 0.4 }]}
        accessibilityRole="button"
        accessibilityLabel="Mark picked words Known"
      >
        <Ionicons name="checkmark-done" size={18} color="#fff" />
        <Text style={styles.markButtonText}>Mark Known</Text>
      </TouchableOpacity>
    </View>
  );
  const actionBar = (
    <FoldAway collapsed={actionBarCollapsed} onSwipeUp={() => setActionBarCollapsed(true)} onSwipeDown={revealMore}>
    <LearnActionBar
      fontSize={storedFontSize}
      lineCount={lineCount}
      wordProgress={wordProgress}
      onDecreaseFontSize={() => setFontSize(storedFontSize - 1)}
      onIncreaseFontSize={() => setFontSize(storedFontSize + 1)}
      lineByLine={lineByLine !== null}
      onToggleLineByLine={contentLines.length > 0 && !quizMode ? toggleLineByLine : undefined}
      lineStep={lineByLine !== null && lineStep >= 0 ? { index: lineStep, count: contentLines.length, onStep: stepLine } : undefined}
      onEditLine={lineByLine !== null && !lyricQuiz ? () => navigation.navigate('Editor', { songId: song.id, lineIndex: lineByLine, lineKey: Date.now() }) : undefined}
      quizMode={!!quizMode}
      onToggleQuizMode={canQuizSong || quizMode ? toggleQuizMode : undefined}
      onShowAllLyrics={lyricQuiz ? () => navigation.setParams({ fillIn: false }) : undefined}
      trickyLinesOnly={trickyLinesOnly}
      onToggleTrickyLines={lyricQuiz && (trickyLines.size > 0 || trickyLinesOnly) ? () => setTrickyLinesOnly(!trickyLinesOnly) : undefined}
      onNextLine={nextLine !== null && !lyricQuiz && !quizMode ? () => {
        setFoundLine(nextLine);
        setScrollToLine({ index: nextLine, key: Date.now() });
      } : undefined}
    />
    </FoldAway>
  );

  const lyricsView = (
    <>
      {spotifyConnected && !barGone && (
        <SpotifyBar
          hidden={spotifyBarHidden}
          onHiddenChange={setSpotifyBarHidden}
          hideStatus={noSyncHidden && spotify.timings === 'none'}
          sync={spotify}
          dueCount={songReviewCount}
          onReview={() => {
            const items = buildSongReview(song.id, words, songs);
            if (items.length) setSongReview(items);
          }}
          selectedLineIndex={selectedLineIndex}
          follow={followSpotify}
          onToggleFollow={() => setFollowSpotify(!followSpotify)}
          onDictation={quizMode ? undefined : (lineIndex) => {
            setSelectedWord(null);
            setDictation({ lineIndex, checked: false });
            void spotify.playLine(lineIndex);
          }}
          // Only "No synced lyrics" can be closed; "Not playing" holds the Play button
          onDismiss={song && spotify.timings === 'none' ? () => (noSyncHidden ? setPlayingNoteClosed([...playingNoteClosed, song.id]) : setNoSyncHiddenSongs([...noSyncHiddenSongs, song.id])) : undefined}
        />
      )}
      {quizMode ? (
        <LineQuizMode
          key={song.id}
          song={song}
          lines={lines}
          contentLines={contentLines}
          startLine={quizMode.startLine}
          translationLanguages={localSelectedLanguages}
          findEntry={findSavedEntry}
          spotify={spotify}
          isWide={isWide}
        />
      ) : (
      <LearnLyricsView
        lines={lines}
        fontSize={fontSize}
        showTranslations={showTranslations}
        selectedLanguages={localSelectedLanguages}
        blurTranslations={blurTranslations}
        unblurredTranslations={unblurredTranslations}
        renderPressableText={renderPressableText}
        onTranslationPress={handleTranslationPress}
        highlightLineIndex={selectedLineIndex}
        highlightDefinitions={selectedDefinitions}
        highlightOccurrence={selectedWordEntry ? selectedOccurrence : undefined}
        showSections={showSections}
        onVisibleRange={setVisibleRange}
        preloadedLines={preloadedLines}
        reverse={reverseLyrics && showTranslations && !lyricQuiz}
        revealedOriginals={revealedOriginals}
        onRevealOriginal={(lineIndex) => setRevealedOriginals((prev) => new Set(prev).add(lineIndex))}
        scrollToLine={scrollToLine}
        playingLineIndex={spotify.currentLine}
        dictationLineIndex={dictation && !dictation.checked ? dictation.lineIndex : null}
        foundLineIndex={foundLine}
        onlyLines={lineByLine !== null ? new Set([lineByLine]) : trickyLinesOnly ? trickyLines : null}
        scrollKey={song.id}
        lineNotes={song.lineNotes}
        bottomInset={isWide ? 0 : sheetHeight}
      />
      )}
      {heldLine !== null && lines[heldLine] && (
        <LineActionSheet
          visible
          line={lines[heldLine].original.trim()}
          translationLanguages={lines[heldLine].translations
            .filter((t) => localSelectedLanguages.includes(t.language) && t.text.trim())
            .map((t) => t.language)}
          onClose={() => setHeldLine(null)}
          onCopy={() => copyLine(heldLine)}
          onEditLine={() => navigation.navigate('Editor', { songId: song.id, lineIndex: heldLine, lineKey: Date.now() })}
          onEditTranslation={(language) => navigation.navigate('Editor', { songId: song.id, lineIndex: heldLine, lineKey: Date.now(), translationLanguage: language })}
        />
      )}
      {copiedLine && (
        <View style={styles.toastStack} pointerEvents="box-none">
          <Toast message="Copied the line" />
        </View>
      )}
    </>
  );

  return (
    <ScreenWrapper noPadding>
      <View style={styles.header} {...headerSwipe.panHandlers}>
        <View style={styles.headerLeft}>
          <SongMetadataHeader
            songName={song.songName}
            artistName={song.artistName}
            originalLanguages={song.originalLanguages ?? []}
          />
        </View>
        <View style={styles.headerRight}>
          {!quizMode && !lyricQuiz && (
            <TouchableOpacity
              style={[styles.headerBtn, markMode && { backgroundColor: Colors.primary }]}
              onPress={markMode ? exitMarkMode : startMarkMode}
              accessibilityRole="button"
              accessibilityLabel={markMode ? 'Stop picking words' : 'Pick words to mark Known'}
            >
              <Ionicons name="checkmark-done-outline" size={22} color={markMode ? '#fff' : Colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowDropdown(true)}
            accessibilityRole="button"
            accessibilityLabel="Learn settings"
          >
            <View style={styles.headerBtnIcons}>
              <View style={styles.languageIconWrapper}>
                <Ionicons name="language-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.settingsIconWrapper}>
                <Ionicons name="settings-outline" size={22} color={Colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading overlay - positioned below header */}
      {(isLoadingSong || isRendering) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading song...</Text>
        </View>
      )}

      {/* Settings Menu */}
      {song && (
        <LearnSettingsMenu
          visible={showDropdown}
          onClose={() => setShowDropdown(false)}
          onEdit={() => navigation.navigate('Editor', { songId: song.id })}
          selectedLanguages={localSelectedLanguages}
          onLanguagesChange={handleLanguageChange}
          availableTranslations={translationNames(song.translations)}
          originals={(song.extraOriginals ?? []).filter((e) => e.lyrics.trim()).length > 0
            ? [{ id: '', name: 'Main', icon: null }, ...(song.extraOriginals ?? []).flatMap((e, i) => (e.lyrics.trim()
                ? [{ id: e.id, name: originalVersionName(e, i), icon: getFaviconUrl(e.sourceUrl ?? '') }]
                : []))]
            : []}
          originalId={learnOriginal(song).extraIndex < 0 ? '' : song.learnOriginalId ?? ''}
          originalsMisaligned={!learnOriginal(song).aligned}
          onOriginalChange={(id) => { void updateSong(song.id, { learnOriginalId: id || undefined }); }}
          showIpa={showIpa}
          onShowIpaChange={setShowIpa}
          showIpaBrackets={showIpaBrackets}
          onToggleShowIpaBrackets={toggleShowIpaBrackets}
          showEmoji={showEmoji}
          onShowEmojiChange={setShowEmoji}
          showMeaning={showMeaning}
          onShowMeaningChange={setShowMeaning}
          showSections={showSections}
          onToggleShowSections={toggleShowSections}
          onCopySections={() => Clipboard.setStringAsync(formatSongSections(learnOriginal(song).lyrics.split('\n')))}
          blurTranslations={blurTranslations}
          onToggleBlur={toggleBlurTranslations}
          reverseLyrics={reverseLyrics}
          onToggleReverseLyrics={toggleReverseLyrics}
          wideWordSpacing={wideWordSpacing}
          annotationGap={annotationGap}
          onCycleAnnotationGap={cycleAnnotationGap}
          onToggleWideWordSpacing={toggleWideWordSpacing}
          highlightNewWords={highlightNewWords}
          onToggleHighlightNewWords={toggleHighlightNewWords}
          quietKnownWords={quietKnownWords}
          onToggleQuietKnownWords={toggleQuietKnownWords}
          autoLineByLine={autoLineByLineSetting}
          onToggleAutoLineByLine={toggleAutoLineByLine}
          autoPlayAudio={autoPlayAudio}
          onToggleAutoPlayAudio={toggleAutoPlayAudio}
          showMasteryLevelColors={showMasteryLevelColors}
          onToggleShowMasteryLevelColors={toggleShowMasteryLevelColors}
          previewLine={previewLineIndex !== null ? lines[previewLineIndex] : null}
          previewLineIndex={previewLineIndex ?? 0}
          fontSize={storedFontSize}
          showTranslations={showTranslations}
          renderPressableText={renderPressableText}
        />
      )}

      {isWide ? (
        /* ── Wide: left lyrics panel + right word/controls panel ── */
        <View style={styles.wideMain}>
          <View style={styles.wideLeft}>
            {markMode ? markBar : actionBar}
            {lyricsView}
          </View>
          <View style={styles.wideRightDivider} />
          <View style={styles.wideRight}>
            {wordPanel ?? (
              <View style={styles.wordPlaceholder}>
                <Ionicons name="finger-print-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.wordPlaceholderText}>Tap a word to look it up</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        /* ── Narrow: stacked ── */
        <View style={styles.narrowMain}>
          {markMode ? markBar : actionBar}
          {lyricsView}
          {/* The word opens in a sheet sliding over the bottom of the lyrics, so nothing above them moves */}
          {wordPanel && (
            <WordSheet
              resetKey={selectedWord}
              closing={closingWordCard}
              onClosed={() => setSelectedWord(null)}
              onHeight={setSheetHeight}
              onClose={dictationPanel ? () => setDictation(null) : selectedWord && !gapPanel ? closeWordCard : undefined}
            >
              {wordPanel}
            </WordSheet>
          )}
        </View>
      )}
      {songReview && <ReviewSession dueItems={songReview} onClose={() => setSongReview(null)} isWide={isWide} />}
      {markedToast && (
        <View style={styles.toastStack} pointerEvents="box-none">
          <Toast message={markedToast} />
        </View>
      )}
      {removedWord && (
        <View style={styles.toastStack} pointerEvents="box-none">
          <Toast
            message={<>Removed<Text style={{ fontWeight: 'bold' }}> {removedWord.entry.word}</Text></>}
            onUndo={() => {
              void restoreWord(removedWord.entry);
              setRemovedWord(null);
            }}
          />
        </View>
      )}
    </ScreenWrapper>
  );
}

// A gap in the lyrics, the same length whatever the missing word, so it doesn't give it away
const GAP = '_____';

// Punctuation next to a word (brackets, quotes, commas, ?) is colored like the word
function renderEdge(text: string, color: string, fontSize: number): React.ReactNode {
  if (!text) return text;
  return <Text style={{ color, fontSize, lineHeight: fontSize * 1.6 }}>{text}</Text>;
}

const styles = StyleSheet.create({
  sheetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  gap: { color: Colors.primary },
  gapSelected: { fontWeight: '700', backgroundColor: 'rgba(108, 92, 231, 0.18)' },
  gapCard: {
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  gapCardWide: {
    flex: 1,
  },
  gapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gapCardTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  gapCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gapCardLine: {
    fontSize: 18,
    color: Colors.text,
  },
  gapCardAnswer: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
  },
  gapCardSong: {
    fontSize: 12,
    color: Colors.primaryLight,
  },
  gapCardHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  quizWord: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  /* Layout */
  loadingOverlay: {
    position: 'absolute',
    top: 60,  // Position below the header
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,  // Lower than header but above content
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  wideMain: {
    flex: 1,
    flexDirection: 'row',
  },
  wideLeft: {
    flex: 3,
  },
  wideRightDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  wideRight: {
    flex: 2,
    padding: 16,
  },
  narrowMain: {
    flex: 1,
    // The word sheet starts below, out of sight, and slides up
    overflow: 'hidden',
  },
  wordPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  wordPlaceholderText: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 4,
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  markBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  markClose: { padding: 6 },
  markCount: { flex: 1, color: Colors.textSecondary, fontSize: 14 },
  markButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  ignoreButton: { backgroundColor: Colors.background },
  markButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  headerBtn: {
    padding: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
  },
  headerBtnIcons: {
    position: 'relative',
    width: 28,
    height: 28,
  },
  languageIconWrapper: {
    position: 'absolute',
    top: -3,
    left: 8,
  },
  settingsIconWrapper: {
    position: 'absolute',
    top: 8,
    left: -3,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.surface,
  },
  toastStack: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  wordCardContainer: {
    marginHorizontal: 16,
  },
  // The sheet is the card's box, so the card takes its full width
  wordCardInSheet: {
    marginHorizontal: 0,
  },
  savedAlsoLookUp: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  annotationSpace: {
    minHeight: 14,
    marginBottom: -6,
    flexDirection: 'row',
    gap: 4,
  },
  annotationStack: {
    alignItems: 'center',
  },
  wordAnnotation: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
});
