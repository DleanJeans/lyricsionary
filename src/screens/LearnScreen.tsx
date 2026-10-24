import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, I18nManager, StyleSheet, TouchableOpacity, View } from 'react-native';
import LearnActionBar from '../components/LearnActionBar';
import { useWordProgress } from '../hooks/useWordProgress';
import LearnLyricsView, { type LearnLine } from '../components/LearnLyricsView';
import LearnSettingsMenu from '../components/LearnSettingsMenu';
import EmptyState from '../components/EmptyState';
import NewWordCard from '../components/NewWordCard';
import ScreenWrapper from '../components/ScreenWrapper';
import SongMetadataHeader from '../components/SongMetadataHeader';
import { Text } from '../components/Text';
import WordCard from '../components/WordCard';
import { getFlagForLanguage, getLanguageNameFromCode, isRtlLanguage } from '../constants/languages';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { useBackToQuit } from '../hooks/useBackToQuit';
import { useIsWide } from '../hooks/useLayout';
import { isWordIgnored, makeIgnoredWordChecker, useStore } from '../store/useStore';
import { RootTabParamList, WordContext, WordEntry } from '../types';
import { isLyricWord, removeSpecialChars } from '../utils/cleanLyrics';
import { withWordForms } from '../utils/definitionHighlight';
import { buildKnownGermanWords, getCompoundParts, isGermanLanguage, joinCompoundIpa } from '../utils/compoundWords';
import { getGermanExpandedForm, hasContractedPrefix, hasHyphenatedPrefix, splitElisionParts } from '../utils/wordTransform';

const PREVIEW_MAX_WORDS = 8;

export default function LearnScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootTabParamList, 'Learn'>>();
  const isWide = useIsWide();
  useBackToQuit();
  const songs = useStore((s) => s.songs);
  const words = useStore((s) => s.words);
  const ignoredWords = useStore((s) => s.ignoredWords);
  const compoundSplits = useStore((s) => s.compoundSplits);
  const currentSongId = useStore((s) => s.currentSongId);
  const fontSize = useStore((s) => s.fontSize);
  const setFontSize = useStore((s) => s.setFontSize);
  const showTranslations = useStore((s) => s.showTranslations);
  const toggleTranslations = useStore((s) => s.toggleTranslations);
  const setSelectedTranslationLanguages = useStore((s) => s.setSelectedTranslationLanguages);
  const blurTranslations = useStore((s) => s.blurTranslations);
  const toggleBlurTranslations = useStore((s) => s.toggleBlurTranslations);
  const showMasteryLevelColors = useStore((s) => s.showMasteryLevelColors);
  const toggleShowMasteryLevelColors = useStore((s) => s.toggleShowMasteryLevelColors);
  const showIpa = useStore((s) => s.showIpa);
  const setShowIpa = useStore((s) => s.setShowIpa);
  const showEmoji = useStore((s) => s.showEmoji);
  const setShowEmoji = useStore((s) => s.setShowEmoji);
  const isLoadingSong = useStore((s) => s.isLoadingSong);
  const setIsLoadingSong = useStore((s) => s.setIsLoadingSong);

  const activeSongId = route.params?.songId ?? currentSongId;
  const song = songs.find((s) => s.id === activeSongId);
  const isGermanSong = isGermanLanguage(song?.originalLanguages);
  const knownGermanWords = useMemo(() => buildKnownGermanWords(words), [words]);
  const isIgnoredWord = useMemo(() => makeIgnoredWordChecker(ignoredWords), [ignoredWords]);
  const wordEntryIndex = useMemo(() => {
    const songLanguages = new Set(
      (song?.originalLanguages ?? []).map((language) =>
        (getLanguageNameFromCode(language) ?? language).toLowerCase()
      )
    );
    const index = new Map<string, (typeof words)[number]>();
    for (const entry of words) {
      const language = (getLanguageNameFromCode(entry.language) ?? entry.language).toLowerCase();
      if (songLanguages.size === 0 || songLanguages.has(language)) {
        const key = entry.word.toLowerCase();
        if (!index.has(key)) index.set(key, entry);
      }
    }
    return index;
  }, [song?.originalLanguages, words]);
  const findWordEntry = useCallback(
    (candidate: string) => wordEntryIndex.get(candidate.toLowerCase()),
    [wordEntryIndex]
  );
  const songLanguages = (song?.originalLanguages ?? []).map((language) => language.toLowerCase());
  const hasFrenchLanguage = songLanguages.some((language) => language === 'french' || language === 'fr');
  const hasItalianLanguage = songLanguages.some((language) => language === 'italian' || language === 'it');
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
      const expanded = isGermanSong ? getGermanExpandedForm(cleanedWord, 'German') : null;
      return expanded ? findWordEntry(expanded) : undefined;
    },
    [findWordEntry, hasFrenchLanguage, hasItalianLanguage, isGermanSong]
  );
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [selectedOccurrence, setSelectedOccurrence] = useState<number>(1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [localSelectedLanguages, setLocalSelectedLanguages] = useState<string[]>([]);
  const [unblurredTranslations, setUnblurredTranslations] = useState<Set<string>>(new Set());
  const [isRendering, setIsRendering] = useState(true);
  const [computedLines, setComputedLines] = useState<LearnLine[]>([]);

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
  } | null => {
    if (!wordEntry.contexts || wordEntry.contexts.length === 0) return null;
    const occ = occurrence || 1;
    // Try matching by songId + context line + occurrence first
    const bySongLineOcc = wordEntry.contexts.find(c =>
      c.songId === song?.id && c.context === line && (c.occurrence || 1) === occ
    );
    if (bySongLineOcc) {
      return { emoji: bySongLineOcc.emoji, ipa: bySongLineOcc.ipa, definition: bySongLineOcc.definition };
    }
    // Try matching by songId + context line (no occurrence)
    const bySongAndLine = wordEntry.contexts.find(c =>
      c.songId === song?.id && c.context === line && !c.occurrence
    );
    if (bySongAndLine) {
      return { emoji: bySongAndLine.emoji, ipa: bySongAndLine.ipa, definition: bySongAndLine.definition };
    }
    // Try matching by songId only
    const bySong = wordEntry.contexts.find(c => c.songId === song?.id);
    if (bySong) {
      return { emoji: bySong.emoji, ipa: bySong.ipa, definition: bySong.definition };
    }
    // Try matching by context line text only
    const byLine = wordEntry.contexts.find(c => c.context === line);
    if (byLine) {
      return { emoji: byLine.emoji, ipa: byLine.ipa, definition: byLine.definition };
    }
    // Fall back to first context
    const first = wordEntry.contexts[0];
    return { emoji: first.emoji, ipa: first.ipa, definition: first.definition };
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
        };
      });
      setComputedLines(newLines);
    }, 0);

    return () => clearTimeout(timer);
  }, [song]);

  const lines = computedLines;

  const lineCount = lines.length;
  // Updates as words are saved or ignored, like the song's progress in Songs
  const progressSongs = useMemo(() => (song ? [song] : []), [song]);
  const wordProgress = useWordProgress(progressSongs).get(song?.id ?? '');

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

  // Reset unblurred translations when blur toggle changes or song changes
  useEffect(() => {
    setUnblurredTranslations(new Set());
  }, [blurTranslations, activeSongId]);

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

  const handleWordPress = (word: string, line: string, lineIndex: number, occurrence: number) => {
    const cleaned = removeSpecialChars(word);
    if (isLyricWord(cleaned)) {
      setSelectedWord(cleaned);
      setSelectedLine(line);
      setSelectedLineIndex(lineIndex);
      setSelectedOccurrence(occurrence);
    }
  };

  const handleTranslationPress = (lineIndex: number, translationIndex: number) => {
    const key = `${lineIndex}-${translationIndex}`;
    if (blurTranslations) {
      if (!unblurredTranslations.has(key)) {
        setUnblurredTranslations((prev) => new Set(prev).add(key));
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
    // CJK scripts do not separate words with spaces. Keep whitespace and
    // Latin words intact, but expose each CJK character as a selectable token.
    const textWords = text.match(/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}|[^\s]+|\s+/gu) ?? [];
    const occurrenceMap: Record<number, number> = {};
    const wordCountMap: Record<string, number> = {};
    textWords.forEach((w, i) => {
      if (!w.trim()) return;
      const cleaned = removeSpecialChars(w);
      if (cleaned) {
        wordCountMap[cleaned.toLowerCase()] = (wordCountMap[cleaned.toLowerCase()] || 0) + 1;
        occurrenceMap[i] = wordCountMap[cleaned.toLowerCase()];
      }
    });
    return (
      <View style={{ flexDirection: isRtlSong !== !!I18nManager.isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap' }}>
        {textWords.map((word, i) => {
          if (!word.trim()) {
            return <Text key={i} style={{ fontSize, lineHeight: fontSize * 1.6 }}>{word}</Text>;
          }

          const cleanedWord = removeSpecialChars(word);

          const hasContractedPrefixWord = hasContractedPrefix(cleanedWord);

          // Check if this word should be split for elision rendering (e.g., l'essence → l' + essence, dell'umanità → dell' + umanità),
          // unless the whole word is saved (e.g., c'est)
          const elisionParts = cleanedWord && hasContractedPrefixWord && (hasFrenchLanguage || hasItalianLanguage) && !findWordEntry(cleanedWord)
            ? splitElisionParts(cleanedWord)
            : null;

          if (elisionParts && elisionParts.length > 1) {
            // Compute display parts by splitting the original text to match the cleaned parts
            let cleanStart = 0;
            while (cleanStart < word.length && /[^\p{L}\p{N}'-]/u.test(word[cleanStart])) {
              cleanStart++;
            }

            const displayParts: string[] = [];
            let pos = cleanStart;
            for (let p = 0; p < elisionParts.length; p++) {
              const partLength = elisionParts[p].length;
              if (p === 0) {
                displayParts.push(word.slice(0, cleanStart + partLength));
                pos = cleanStart + partLength;
              } else if (p === elisionParts.length - 1) {
                displayParts.push(word.slice(pos));
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

            let displayContent = '';
            if (showIpa && mainEntry) {
              const ipaValue = ctx?.ipa || mainEntry.pronunciation;
              if (ipaValue) {
                displayContent = ipaValue.includes('/') ? ipaValue : `/${ipaValue}/`;
              }
            }

            const contextEmoji = ctx?.emoji;
            const globalEmoji = mainEntry?.emoji;
            const effectiveEmoji = contextEmoji || globalEmoji;
            const shouldShowEmoji = showEmoji && mainEntry && effectiveEmoji &&
              effectiveEmoji !== getFlagForLanguage(mainEntry.language);

            return (
              <View key={i} style={{ alignItems: 'center' }}>
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
                <Text style={{ fontSize, lineHeight: fontSize * 1.6 }}>
                  {elisionParts.map((part, pi) => {
                    const partEntry = partEntries[pi];
                    const isPartSelected = selectedWord && word.toLowerCase() === selectedWord.toLowerCase();
                    const isPartActiveOccurrence = isPartSelected && lineIndex === selectedLineIndex && (occurrenceMap[i] || 1) === selectedOccurrence;
                    const partColor = isPartSelected
                      ? Colors.primary
                      : (showMasteryLevelColors && partEntry?.masteryLevel)
                        ? getMasteryLevelColor(partEntry.masteryLevel)
                        : Colors.text;
                    const displayPart = displayParts[pi] || part;
                    return (
                      <Text
                        key={pi}
                        onPress={() => handleWordPress(word, text, lineIndex, occurrenceMap[i] || 1)}
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
                </Text>
              </View>
            );
          }

          // Standard rendering for non-elision words
          const wordEntry = cleanedWord ? findSavedEntry(cleanedWord) ?? null : null;

          const isSelected = selectedWord && cleanedWord.toLowerCase() === selectedWord.toLowerCase();
          const isActiveOccurrence = isSelected && lineIndex === selectedLineIndex && (occurrenceMap[i] || 1) === selectedOccurrence;

          const wordCtx = wordEntry ? findWordContext(wordEntry, text, occurrenceMap[i] || 1) : null;

          let displayContent = '';
          if (showIpa && wordEntry) {
            const ipaValue = wordCtx?.ipa || wordEntry.pronunciation;
            if (ipaValue) {
              displayContent = ipaValue.includes('/') ? ipaValue : `/${ipaValue}/`;
            }
          }

          const contextEmoji = wordCtx?.emoji;
          const globalEmoji = wordEntry?.emoji;
          let effectiveEmoji = contextEmoji || globalEmoji;
          let shouldShowEmoji = showEmoji && wordEntry && effectiveEmoji &&
            effectiveEmoji !== getFlagForLanguage(wordEntry.language);

          const isIgnored = !!cleanedWord && isIgnoredWord(cleanedWord, song?.originalLanguages?.[0] || 'unknown');

          const compoundParts = !wordEntry && !isIgnored && isGermanSong && cleanedWord
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
            if (compoundIpa) displayContent = `/${compoundIpa}/`;
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

          const wordColor = isSelected
            ? Colors.primary
            : isIgnored
              ? Colors.textMuted
              : (showMasteryLevelColors && wordEntry?.masteryLevel)
              ? getMasteryLevelColor(wordEntry.masteryLevel)
              : Colors.text;

          return (
            <View key={i} style={{ alignItems: 'center' }}>
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
              <Text
                onPress={() => handleWordPress(word, text, lineIndex, occurrenceMap[i] || 1)}
                style={{
                  fontSize,
                  lineHeight: fontSize * 1.6,
                  color: wordColor,
                  fontWeight: isActiveOccurrence ? '700' : '400',
                }}
              >
                {compoundParts && compoundStart >= 0 ? (
                  <>
                    {word.slice(0, compoundStart)}
                    {compoundParts.map((part, pi) => {
                      const partEntry = compoundEntries?.[pi];
                      const partColor = isSelected
                        ? Colors.primary
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
                ) : word}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }, [findWordEntry, findSavedEntry, hasFrenchLanguage, hasItalianLanguage, isRtlSong, words, isIgnoredWord, compoundSplits, knownGermanWords, isGermanSong, song?.originalLanguages, song?.id, selectedWord, selectedLineIndex, selectedOccurrence, showIpa, showEmoji, fontSize, showMasteryLevelColors, findWordContext]);

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

  // Get translation line for the selected line
  const selectedTranslationLine =
    selectedLineIndex !== null && lines[selectedLineIndex]
      ? lines[selectedLineIndex].translations
          .filter((tl) => tl.show && localSelectedLanguages.includes(tl.language))
          .map((tl) => tl.text)
          .join(' / ')
      : undefined;

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

  const wordPanel =
    selectedWord && selectedWordEntry ? (
      <View style={[styles.wordCardContainer]}>
        <WordCard
          item={selectedWordEntry}
          showDelete={false}
          showClose={true}
          onClose={() => setSelectedWord(null)}
          source="Learn"
          songId={song.id}
          songName={song.songName}
          artistName={song.artistName}
          lyricsLine={selectedLine ?? undefined}
          translationLine={selectedTranslationLine}
          originalLanguages={song.originalLanguages}
          occurrence={selectedOccurrence}
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
        onClose={() => setSelectedWord(null)}
        isWide={isWide}
        occurrence={selectedOccurrence}
      />
    ) : null;

  const actionBar = (
    <LearnActionBar
      fontSize={fontSize}
      lineCount={lineCount}
      wordProgress={wordProgress?.label}
      onDecreaseFontSize={() => setFontSize(fontSize - 1)}
      onIncreaseFontSize={() => setFontSize(fontSize + 1)}
    />
  );

  const lyricsView = (
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
    />
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
          showEmoji={showEmoji}
          onShowEmojiChange={setShowEmoji}
          blurTranslations={blurTranslations}
          onToggleBlur={toggleBlurTranslations}
          showMasteryLevelColors={showMasteryLevelColors}
          onToggleShowMasteryLevelColors={toggleShowMasteryLevelColors}
          previewLine={previewLineIndex !== null ? lines[previewLineIndex] : null}
          previewLineIndex={previewLineIndex ?? 0}
          fontSize={fontSize}
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
          {wordPanel}
          {actionBar}
          {lyricsView}
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
