import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ActivityIndicator, I18nManager, LayoutChangeEvent, StyleSheet, TouchableOpacity, View } from 'react-native';
import AnimatedHeight from '../components/AnimatedHeight';
import Toast from '../components/Toast';
import LearnActionBar from '../components/LearnActionBar';
import { useNextLineToLearn, useWordProgress } from '../hooks/useWordProgress';
import LearnLyricsView, { type LearnLine } from '../components/LearnLyricsView';
import LearnSettingsMenu from '../components/LearnSettingsMenu';
import EmptyState from '../components/EmptyState';
import NewWordCard from '../components/NewWordCard';
import ScreenWrapper from '../components/ScreenWrapper';
import SongMetadataHeader from '../components/SongMetadataHeader';
import { Text } from '../components/Text';
import WordCard from '../components/WordCard';
import WordQuiz from '../components/WordQuiz';
import { getFlagForLanguage, isRomanized, isRtlLanguage } from '../constants/languages';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { findWordIndex, type WordRect } from '../components/SelectableTranslation';
import { useBackToQuit } from '../hooks/useBackToQuit';
import { useIsWide } from '../hooks/useLayout';
import { isWordIgnored, makeIgnoredWordChecker, useStore } from '../store/useStore';
import { RootTabParamList, WordContext, WordEntry } from '../types';
import { cleanLyricWord, isLyricWord, removeSpecialChars, splitEdgePunctuation, splitLyricTokens } from '../utils/cleanLyrics';
import { pickDefinition, withWordForms } from '../utils/definitionHighlight';
import { formatSongSections } from '../utils/songSections';
import { formatIpa } from '../utils/ipaDisplay';
import { buildKnownGermanWords, getCompoundParts, isGermanLanguage, joinCompoundIpa } from '../utils/compoundWords';
import { canFillGaps, gapWord, songWordIndex } from '../utils/lyricGaps';
import { draggedPhrase, groupCjkTokens, groupSpacedWords, isCjkWord } from '../utils/cjkWords';
import { getKoreanStem, isKoreanLanguage } from '../utils/koreanWords';
import { getRomanceBaseWord } from '../utils/romanceClitics';
import { addStressMark, isStressLanguage, removeStressMarks } from '../utils/russianStress';
import { romanizeLine } from '../utils/romanize';
import { buildLyricQuiz, buildMeaningQuiz, isTricky, quizKindFor } from '../utils/wordQuiz';
import { lineWords } from '../utils/reviewQuiz';
import LineDrill from '../components/LineDrill';
import SpotifyBar from '../components/SpotifyBar';
import { usePersistedState } from '../hooks/usePersistedState';
import { useSpotifyLyricsSync } from '../hooks/useSpotifyLyricsSync';
import { normalizePartOfSpeech, type PartOfSpeech } from '../utils/partOfSpeech';
import { getWiktionaryDefinitions, getWiktionaryPronunciation } from '../utils/wiktionary';
import { getGermanExpandedForm, hasContractedPrefix, hasHyphenatedPrefix, splitElisionParts } from '../utils/wordTransform';
import { findWordSpots, stepWordSpot } from '../utils/wordLines';
import WordSpotStepper from '../components/WordSpotStepper';
import LemmaMergeHint from '../components/LemmaMergeHint';
import Dictation from '../components/Dictation';
import SplitPhraseHint from '../components/SplitPhraseHint';
import { findSavedWord, spellingsOf } from '../utils/wordForms';
import {
  findSplitPhrases, germanSeparableVerb, isSplitPhrase, joinLineWords, phraseLookupWords, phraseOccurrenceAt, splitPhraseParts,
} from '../utils/splitPhrases';

const PREVIEW_MAX_WORDS = 8;

export default function LearnScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootTabParamList, 'Learn'>>();
  const isWide = useIsWide();
  useBackToQuit();
  const songs = useStore((s) => s.songs);
  const words = useStore((s) => s.words);
  const addOrUpdateWord = useStore((s) => s.addOrUpdateWord);
  const deleteWord = useStore((s) => s.deleteWord);
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
      if (hasFrenchLanguage || hasItalianLanguage) {
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
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  // The X on the word card folds it away first on narrow screens, then clears the word
  const [closingWordCard, setClosingWordCard] = useState(false);
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
  const [removedWord, setRemovedWord] = useState<{ entry: WordEntry; ignored?: boolean } | null>(null);
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

  // Initialize selected languages when song changes
  useEffect(() => {
    if (!song) {
      setLocalSelectedLanguages([]);
      setSelectedTranslationLanguages([]);
      return;
    }

    // A language selection belongs to the current song. Reset it when the
    // route changes so the previous song's translations are not carried over.
    const availableLanguages = song.translations.map(t => t.language);
    setLocalSelectedLanguages(availableLanguages);
    setSelectedTranslationLanguages(availableLanguages);
    // Unselecting every language on the previous song turned translations off
    if (availableLanguages.length > 0 && !useStore.getState().showTranslations) toggleTranslations();
    setUnblurredTranslations(new Set());
  }, [song?.id, setSelectedTranslationLanguages]);

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
      const originalLines = song.originalLyrics.split('\n');
      const translationLines = song.translations.map((t) => t.lyrics.split('\n'));
      // A song in Cyrillic, Greek, Korean, Hindi or Arabic without a Romanized version gets one made here
      const romanizeLanguage = song.translations.some((t) => isRomanized(t.language))
        ? null
        : song.originalLanguages?.[0] ?? '';
      const newLines = originalLines.map((line, i) => {
        const originalNormalized = normalizeText(line);
        const translations = translationLines.map((tl, ti) => {
          const translationText = tl[i] || '';
          const translationNormalized = normalizeText(translationText);
          // Only include translation if it's different from original (word-wise comparison)
          const isDifferent = originalNormalized !== translationNormalized;
          return {
            language: song.translations[ti].language,
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
  const toggleLineByLine = () => {
    if (lineByLine !== null) {
      const at = lineByLine;
      setLineByLine(null);
      setScrollToLine({ index: at, key: Date.now() });
      return;
    }
    const start = [selectedLineIndex, foundLine].find((i) => i !== null && contentLines.includes(i));
    setLineByLine(start ?? contentLines[0]);
  };
  useEffect(() => setLineByLine(null), [song?.id]);
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
    () => (selectedWord ? findWordSpots(lines.map((line) => line.original), selectedWord, (candidate) => !!findSavedEntry(candidate)) : []),
    [selectedWord, lines, findSavedEntry]
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
  const highlightNewWords = useStore((s) => s.highlightNewWords);
  const toggleHighlightNewWords = useStore((s) => s.toggleHighlightNewWords);
  const quietKnownWords = useStore((s) => s.quietKnownWords);
  const toggleQuietKnownWords = useStore((s) => s.toggleQuietKnownWords);
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
  // Songs whose "Not playing on Spotify" bar was closed; it still shows while Spotify plays the song
  const [notPlayingHiddenSongs, setNotPlayingHiddenSongs] = usePersistedState<string[]>(
    '@lyricsionary_not_playing_hidden_songs',
    [],
    (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')
  );
  const notPlayingHidden = !!song && notPlayingHiddenSongs.includes(song.id) && !spotify.isThisSong && spotify.timings !== 'none';
  const nextLine = useNextLineToLearn(song, originalLines);
  const [followSpotify, setFollowSpotify] = useState(true);
  // A long press on a line's word copies the line with its translations, to share it
  const [copiedLine, setCopiedLine] = useState(false);
  useEffect(() => {
    if (!copiedLine) return;
    const timer = setTimeout(() => setCopiedLine(false), 2000);
    return () => clearTimeout(timer);
  }, [copiedLine]);
  const copyLineRef = useRef<(lineIndex: number) => void>(() => {});
  copyLineRef.current = (lineIndex) => {
    const line = lines[lineIndex];
    if (!line?.original.trim()) return;
    const translations = line.translations
      .filter((t) => localSelectedLanguages.includes(t.language) && t.text.trim())
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

  // The word the last tap saved as new, which a longer Chinese or Japanese word grown from it replaces
  const autoSavedWordRef = useRef<string | null>(null);

  // `single` is the word itself when it's tapped as part of a phrase whose words sit apart, e.g. hört in
  // hört … auf: tapping it again once the phrase is selected selects just the word
  const handleWordPress = (word: string, line: string, lineIndex: number, occurrence: number, single?: { word: string; occurrence: number }) => {
    if (single && word.toLowerCase() === selectedWord?.toLowerCase() && lineIndex === selectedLineIndex && occurrence === selectedOccurrence) {
      handleWordPress(single.word, line, lineIndex, single.occurrence);
      return;
    }
    const cleaned = isSplitPhrase(word) ? word : cleanLyricWord(word);
    autoSavedWordRef.current = null;
    if (isLyricWord(cleaned)) {
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
        else if (isLyricWord(range.word)) {
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

            const partEntries = elisionParts.map(part =>
              part ? findWordEntry(part) ?? null : null
            );

            const mainEntry = [...partEntries].reverse().find(e => e !== null) || null;

            const ctx = mainEntry ? findWordContext(mainEntry, text, occurrenceMap[i] || 1) : null;

            // Known words go without IPA and emoji
            const quiet = quietKnownWords && mainEntry?.masteryLevel === 'Known';
            let displayContent = '';
            if (showIpa && mainEntry && !quiet) {
              const ipaValue = ctx?.ipa || mainEntry.pronunciation;
              if (ipaValue) {
                displayContent = formatIpa(ipaValue, showIpaBrackets);
              }
            }

            const contextEmoji = ctx?.emoji;
            const globalEmoji = mainEntry?.emoji;
            const effectiveEmoji = contextEmoji || globalEmoji;
            const shouldShowEmoji = showEmoji && mainEntry && !quiet && effectiveEmoji &&
              effectiveEmoji !== getFlagForLanguage(mainEntry.language);

            return (
              <View key={i} onLayout={onWordLayout(i)} style={{ alignItems: 'center' }}>
                <View style={styles.annotationSpace}>
                  {shouldShowEmoji && (
                    <Text style={styles.wordAnnotation}>
                      {effectiveEmoji}
                    </Text>
                  )}
                  {displayContent && (
                    <Text style={styles.wordAnnotation} numberOfLines={1}>
                      {displayContent}
                    </Text>
                  )}
                </View>
                <Text style={{ fontSize, lineHeight: fontSize * 1.6, color: Colors.text }}>
                  {leading}
                  {elisionParts.map((part, pi) => {
                    const partEntry = partEntries[pi];
                    const isPartSelected = selectedWord && cleanedWord.toLowerCase() === selectedWord.toLowerCase();
                    const isPartActiveOccurrence = isPartSelected && lineIndex === selectedLineIndex && (occurrenceMap[i] || 1) === selectedOccurrence;
                    const partColor = isPartSelected || isDragged(i)
                      ? Colors.primary
                      : highlightNewWords
                      ? (partEntry ? Colors.textMuted : Colors.text)
                      : (showMasteryLevelColors && partEntry?.masteryLevel)
                        ? getMasteryLevelColor(partEntry.masteryLevel)
                        : Colors.text;
                    const displayPart = displayParts[pi] || part;
                    return (
                      <Text
                        key={pi}
                        onPress={() => handleWordPress(word, text, lineIndex, occurrenceMap[i] || 1)}
                        onLongPress={() => copyLineRef.current(lineIndex)}
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

          // Known words go without IPA and emoji, unless tapped. A phrase whose words sit apart shows them
          // over its first word only
          const quiet = (quietKnownWords && wordEntry?.masteryLevel === 'Known' && !isActiveOccurrence) || !!split?.part;
          let displayContent = '';
          if (showIpa && wordEntry && !quiet) {
            const ipaValue = wordCtx?.ipa || wordEntry.pronunciation;
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

          const compoundParts = !wordEntry && !isIgnored && isGermanSong && cleanedWord && !isPhrase
            ? getCompoundParts(cleanedWord, compoundSplits, knownGermanWords)
            : null;
          const compoundStart = compoundParts ? word.indexOf(cleanedWord) : -1;
          const compoundEntries = compoundParts?.map((part) => findWordEntry(part.lemma));

          // A split compound shows its parts' IPA joined, e.g. Liebesbrief -> /ˈliːbəsbʁiːf/,
          if (showIpa && compoundParts && compoundEntries) {
            const compoundIpa = joinCompoundIpa(
              compoundParts,
              compoundEntries.map((entry) => entry && (findWordContext(entry, text)?.ipa || entry.pronunciation))
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
          const stressIpa = wordCtx?.ipa || wordEntry?.pronunciation;
          const stressedWord = isStressSong && showIpa && stressIpa && wordEntry &&
            removeStressMarks(cleanedWord.toLowerCase()) === removeStressMarks(wordEntry.word.toLowerCase())
            ? addStressMark(edgePunctuation.core, stressIpa)
            : edgePunctuation.core;
          const wordColor = isSelected || isDragged(i)
            ? Colors.primary
            : isIgnored
              ? Colors.textMuted
              : highlightNewWords
              // Only the words left to learn stand out
              ? (wordEntry ? Colors.textMuted : Colors.text)
              : (showMasteryLevelColors && wordEntry?.masteryLevel)
              ? getMasteryLevelColor(wordEntry.masteryLevel)
              : Colors.text;

          // Japanese characters keep no empty space above them, so a line with nothing to show
          // above it stays as tight as the lyrics themselves
          const hasAnnotation = !!shouldShowEmoji || !!displayContent;
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
                  {displayContent && (
                    <Text style={styles.wordAnnotation} numberOfLines={1}>
                      {displayContent}
                    </Text>
                  )}
                </View>
              )}
              <Text
                onPress={() => handleWordPress(split ? split.phrase : word, text, lineIndex, occurrenceMap[i] || 1, single)}
                onLongPress={() => copyLineRef.current(lineIndex)}
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
                      const partColor = isSelected || isDragged(i)
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
                            {part.text}
                          </Text>
                        </React.Fragment>
                      );
                    })}
                    {word.slice(compoundStart + cleanedWord.length)}
                  </>
                ) : (
                  // The punctuation around the word stays uncolored, e.g. the question mark in mich?
                  <>
                    {edgePunctuation.leading}
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
                    {edgePunctuation.trailing}
                  </>
                )}
              </Text>
            </View>
          );
        })}
      </View>
      </GestureDetector>
    );
  }, [findWordEntry, findSavedEntry, hasFrenchLanguage, hasItalianLanguage, isRtlSong, words, isIgnoredWord, compoundSplits, knownGermanWords, isGermanSong, song?.originalLanguages, song?.id, isStressSong, selectedWord, selectedLineIndex, selectedOccurrence, showIpa, showIpaBrackets, showEmoji, fontSize, showMasteryLevelColors, findWordContext, gapEntry, wideWordSpacing, highlightNewWords, quietKnownWords, dragRange, savedSplitPhrases]);

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
          .filter((tl) => tl.show && !isRomanized(tl.language) && (!languages || languages.includes(tl.language)))
          .map((tl) => tl.text)
          .join(' / ')
      : undefined;
  const shownTranslationLine = translationLineOf(localSelectedLanguages);
  // A looked-up word's context keeps the line's translation even with translations turned off
  const selectedTranslationLine = localSelectedLanguages.length ? shownTranslationLine : translationLineOf();

  // A tapped new word is saved as Seen, as Look up and Save would: with Wiktionary's first IPA, its
  // recordings, and the meaning found in the line's translation (or else the first) for this line.
  // The saved word's card then quizzes that meaning. A word tapped away from before Wiktionary
  // answers isn't saved, and neither is a phrase Wiktionary doesn't have.
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
    let cancelled = false;
    setFetchingWord(selectedWord);
    // A word Wiktionary doesn't have is saved as what it's about: a Korean word without its particles,
    // e.g. 너 for 너를, or a Spanish or Portuguese verb without its pronouns, e.g. amar for amarte
    const baseWord = (isKoreanSong ? getKoreanStem(selectedWord, { loose: true }) : null) ??
      getRomanceBaseWord(selectedWord, song.originalLanguages, { loose: true });
    const lookUp = (word: string) =>
      Promise.all([getWiktionaryDefinitions(word, songLanguage), getWiktionaryPronunciation(word, songLanguage)])
        .then(([definitions, pronunciation]) => ({ word, definitions, pronunciation }));
    // A phrase whose words sit apart isn't a page on Wiktionary, e.g. hört … auf
    const firstLookUp = isSplitPhrase(selectedWord)
      ? Promise.resolve({ word: selectedWord, definitions: null, pronunciation: null })
      : lookUp(selectedWord);
    // The phrase as Wiktionary has it, which it's saved as, with the phrase as written as a form
    let phraseForm: string | undefined;
    firstLookUp.then(async (found) => {
      if (baseWord && !found.definitions?.length) {
        const stemFound = await lookUp(baseWord);
        if (stemFound.definitions?.length) found = stemFound;
      }
      // A phrase whose words sit apart, or a German verb with its particle, as Wiktionary has it:
      // aufhören for hört … auf or "hört auf", "turn off" for turn … off
      if (!found.definitions?.length && /\s/.test(selectedWord)) {
        for (const candidate of await phraseLookupWords(selectedWord, songLanguage, isGermanSong)) {
          if (cancelled) break;
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
      if (cancelled) return;
      setFetchingWord(null);
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
      autoSavedWordRef.current = savedWord;
      const { updateWordEntry } = useStore.getState();
      const addForm = async () => {
        const entry = phraseForm && findSavedWord(useStore.getState().words, savedWord, songLanguage);
        if (entry && phraseForm) await updateWordEntry(entry.id, { forms: [...(entry.forms ?? []), phraseForm] });
      };
      // A phrase's dictionary form saved before, e.g. aufhören, takes it as another form, keeping its level
      const saved = phraseForm ? findSavedWord(useStore.getState().words, savedWord, songLanguage) : undefined;
      if (saved) {
        autoSavedWordRef.current = null;
        void updateWordEntry(saved.id, { contexts: [...saved.contexts, context] }).then(addForm).then(() => setJustSavedWord(savedWord));
        return;
      }
      void addOrUpdateWord(savedWord, songLanguage, pronunciation?.ipa[0], [context], 'Seen', pronunciation?.audio)
        .then(addForm)
        .then(() => setJustSavedWord(savedWord));
    });
    return () => {
      cancelled = true;
      setFetchingWord(null);
    };
    // Saved once per tap, with the line it was tapped in
  }, [selectedWord, selectedWordSaved, selectedWordIgnored, songLanguage, selectedLineIndex, selectedOccurrence]);

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
      ? lines[selectedLineIndex].translations.filter((tl) => tl.show && !isRomanized(tl.language) && localSelectedLanguages.includes(tl.language)).length
      : 0;
  // The quiz would give itself away when the line's translation is, or was, readable
  const selectedTranslationSeen =
    selectedLineIndex !== null &&
    showTranslations &&
    selectedLineTranslationCount > 0 &&
    (!blurTranslations || reverseLyrics || seenAllTranslations || seenTranslationLines.has(selectedLineIndex));

  const revealSelectedTranslation = () => {
    if (selectedLineIndex === null || !blurTranslations) return;
    setUnblurredTranslations((prev) => {
      const next = new Set(prev);
      for (let t = 0; t < selectedLineTranslationCount; t++) next.add(`${selectedLineIndex}-${t}`);
      return next;
    });
    setSeenTranslationLines((prev) => new Set(prev).add(selectedLineIndex));
  };

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
        prompt={<>What does <Text style={styles.quizWord}>{entry.word}</Text> mean here?</>}
        build={() => buildMeaningQuiz({ entry, ...sense, songId: song.id, excludeWords: parts }, useStore.getState().words)}
        hidden={selectedTranslationSeen || lookedUpTap === selectedTap}
        alreadyAnswered={answeredMeanings.has(entry.word.toLowerCase())}
        onAnswered={(correct) => {
          setAnsweredMeanings((prev) => new Set(prev).add(entry.word.toLowerCase()));
          if (!correct) revealSelectedTranslation();
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
    const hint = (elsewhere ? otherContext!.translation : shownTranslationLine) || sense?.answer;
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
              hint={(elsewhere ? otherContext!.translation : shownTranslationLine) || undefined}
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
      <View style={[styles.wordCardContainer]}>
        <WordCard
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
            // shows it as ignored, with the button to unignore it
            void toggleIgnoredWord(item.word, ignoreLanguage);
            setRemovedWord({ entry: item, ignored: true });
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

  const wordPanel = dictationPanel ?? gapPanel ?? (wordCardPanel && (wordSpots.length > 1 || selectedWordEntry || selectedLine?.trim()) ? (
    <View>
      {wordSpots.length > 1 && (
        <WordSpotStepper
          count={wordSpots.length}
          index={wordSpotIndex}
          onStep={goToWordSpot}
        />
      )}
      {selectedWordEntry && <LemmaMergeHint entry={selectedWordEntry} />}
      {splitPhraseHint}
      {wordCardPanel}
    </View>
  ) : wordCardPanel);

  const actionBar = (
    <LearnActionBar
      fontSize={storedFontSize}
      lineCount={lineCount}
      wordProgress={wordProgress}
      onDecreaseFontSize={() => setFontSize(storedFontSize - 1)}
      onIncreaseFontSize={() => setFontSize(storedFontSize + 1)}
      lineByLine={lineByLine !== null}
      onToggleLineByLine={contentLines.length > 0 ? toggleLineByLine : undefined}
      onShowAllLyrics={lyricQuiz ? () => navigation.setParams({ fillIn: false }) : undefined}
      trickyLinesOnly={trickyLinesOnly}
      onToggleTrickyLines={lyricQuiz && (trickyLines.size > 0 || trickyLinesOnly) ? () => setTrickyLinesOnly(!trickyLinesOnly) : undefined}
      onNextLine={nextLine !== null && !lyricQuiz ? () => {
        setFoundLine(nextLine);
        setScrollToLine({ index: nextLine, key: Date.now() });
      } : undefined}
    />
  );

  const lineStep = lineByLine !== null ? contentLines.indexOf(lineByLine) : -1;
  const stepLine = (delta: number) => {
    const next = contentLines[lineStep + delta];
    if (next === undefined) return;
    setSelectedWord(null);
    setLineByLine(next);
  };
  const lineByLineBar = lineByLine !== null && (
    <View style={styles.lineByLineBar}>
      <TouchableOpacity
        onPress={() => stepLine(-1)}
        disabled={lineStep <= 0}
        hitSlop={8}
        style={[styles.lineByLineButton, lineStep <= 0 && styles.lineByLineButtonOff]}
        accessibilityRole="button"
        accessibilityLabel="Previous line"
      >
        <Ionicons name="chevron-back" size={22} color={Colors.text} />
      </TouchableOpacity>
      <Text style={styles.lineByLineText}>{`Line ${lineStep + 1} of ${contentLines.length}`}</Text>
      <TouchableOpacity
        onPress={() => stepLine(1)}
        disabled={lineStep >= contentLines.length - 1}
        hitSlop={8}
        style={[styles.lineByLineButton, lineStep >= contentLines.length - 1 && styles.lineByLineButtonOff]}
        accessibilityRole="button"
        accessibilityLabel="Next line"
      >
        <Ionicons name="chevron-forward" size={22} color={Colors.text} />
      </TouchableOpacity>
    </View>
  );

  const lyricsView = (
    <>
      {lineByLineBar}
      {spotifyConnected && !(noSyncHidden && spotify.timings === 'none') && !notPlayingHidden && (
        <SpotifyBar
          sync={spotify}
          selectedLineIndex={selectedLineIndex}
          follow={followSpotify}
          onToggleFollow={() => setFollowSpotify((f) => !f)}
          onDictation={(lineIndex) => {
            setSelectedWord(null);
            setDictation({ lineIndex, checked: false });
            void spotify.playLine(lineIndex);
          }}
          onDismiss={
            song
              ? () =>
                  spotify.timings === 'none'
                    ? setNoSyncHiddenSongs([...noSyncHiddenSongs, song.id])
                    : setNotPlayingHiddenSongs([...notPlayingHiddenSongs, song.id])
              : undefined
          }
        />
      )}
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
        showSections={showSections}
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
      />
      {copiedLine && (
        <View style={styles.toastStack} pointerEvents="box-none">
          <Toast message="Copied the line" />
        </View>
      )}
    </>
  );

  return (
    <ScreenWrapper noPadding>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SongMetadataHeader
            songName={song.songName}
            artistName={song.artistName}
            originalLanguages={song.originalLanguages ?? []}
          />
        </View>
        <View style={styles.headerRight}>
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
          availableLanguages={song.translations.map(t => t.language)}
          showIpa={showIpa}
          onShowIpaChange={setShowIpa}
          showIpaBrackets={showIpaBrackets}
          onToggleShowIpaBrackets={toggleShowIpaBrackets}
          showEmoji={showEmoji}
          onShowEmojiChange={setShowEmoji}
          showSections={showSections}
          onToggleShowSections={toggleShowSections}
          onCopySections={() => Clipboard.setStringAsync(formatSongSections(song.originalLyrics.split('\n')))}
          blurTranslations={blurTranslations}
          onToggleBlur={toggleBlurTranslations}
          reverseLyrics={reverseLyrics}
          onToggleReverseLyrics={toggleReverseLyrics}
          wideWordSpacing={wideWordSpacing}
          onToggleWideWordSpacing={toggleWideWordSpacing}
          highlightNewWords={highlightNewWords}
          onToggleHighlightNewWords={toggleHighlightNewWords}
          quietKnownWords={quietKnownWords}
          onToggleQuietKnownWords={toggleQuietKnownWords}
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
            {actionBar}
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
          {wordPanel && (
            <AnimatedHeight appear closing={closingWordCard} onClosed={() => setSelectedWord(null)}>
              {wordPanel}
            </AnimatedHeight>
          )}
          {actionBar}
          {lyricsView}
        </View>
      )}
      {removedWord && (
        <View style={styles.toastStack} pointerEvents="box-none">
          <Toast
            message={<>{removedWord.ignored ? 'Ignored' : 'Removed'}<Text style={{ fontWeight: 'bold' }}> {removedWord.entry.word}</Text></>}
            onUndo={() => {
              // Saved back first, so unignoring a selected word doesn't save it as a new word
              void restoreWord(removedWord.entry);
              if (removedWord.ignored && isIgnoredWord(removedWord.entry.word, ignoreLanguage)) {
                void toggleIgnoredWord(removedWord.entry.word, ignoreLanguage);
              }
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

const styles = StyleSheet.create({
  lineByLineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 6,
  },
  lineByLineButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lineByLineButtonOff: {
    opacity: 0.35,
  },
  lineByLineText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
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
  annotationSpace: {
    minHeight: 14,
    marginBottom: -6,
    flexDirection: 'row',
    gap: 4,
  },
  wordAnnotation: {
    fontSize: 10,
    color: Colors.textSecondary,
    maxWidth: 100,
  },
});
