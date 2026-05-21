import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Colors } from '../constants/theme';
import { getFlagForLanguage } from '../constants/languages';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../components/ScreenWrapper';
import { useIsWide } from '../hooks/useLayout';
import { useBackToQuit } from '../hooks/useBackToQuit';
import Toast from '../components/Toast';
import WordCard from '../components/WordCard';
import LearnSettingsMenu from '../components/LearnSettingsMenu';
import { removeSpecialChars } from '../utils/cleanLyrics';
import SongMetadataHeader from '../components/SongMetadataHeader';
import { hyphenatedPrefixRegex, contractedPrefixRegex } from '../utils/regex';
import NewWordCard from '../components/NewWordCard';

export type DisplayMode = 'ipa' | 'definition' | 'none';

interface ComputedLine {
  original: string;
  translations: {
    language: string;
    text: string;
    show: boolean;
  }[];
}

export default function LearnScreen() {
  const navigation = useNavigation<any>();
  const isWide = useIsWide();
  useBackToQuit();
  const {
    songs,
    words,
    currentSongId,
    fontSize,
    setFontSize,
    showTranslations,
    toggleTranslations,
    setSelectedTranslationLanguages,
    blurTranslations,
    toggleBlurTranslations,
    isLoadingSong,
    setIsLoadingSong,
  } = useStore();

  const song = songs.find((s) => s.id === currentSongId);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('none');
  const [showEmoji, setShowEmoji] = useState(false);
  const [enableAnnotations, setEnableAnnotations] = useState(true);
  const [localSelectedLanguages, setLocalSelectedLanguages] = useState<string[]>([]);
  const [unblurredTranslations, setUnblurredTranslations] = useState<Set<string>>(new Set());
  const [languagesInitialized, setLanguagesInitialized] = useState(false);
  const [isRendering, setIsRendering] = useState(true);
  const [computedLines, setComputedLines] = useState<ComputedLine[]>([]);

  // Initialize selected languages when song changes
  useEffect(() => {
    if (song && song.translations.length > 0 && !languagesInitialized) {
      // Auto-select all available translation languages by default
      const availableLanguages = song.translations.map(t => t.language);
      setLocalSelectedLanguages(availableLanguages);
      setSelectedTranslationLanguages(availableLanguages);
      setLanguagesInitialized(true);
    }
  }, [song, languagesInitialized]);

  // Helper function to normalize text for comparison (remove punctuation, compare words only)
  const normalizeText = (text: string): string => {
    return text
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .trim()
      .toLowerCase();
  };

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

  // Turn off loading state once lines are computed
  useEffect(() => {
    if (song && computedLines.length > 0 && isLoadingSong) {
      // Use requestAnimationFrame to ensure the UI has time to render
      requestAnimationFrame(() => {
        setTimeout(() => {
          setIsLoadingSong(false);
          setIsRendering(false);
        }, 50);
      });
    }
  }, [song, computedLines, isLoadingSong]);

  // Reset rendering state when song changes
  useEffect(() => {
    if (currentSongId) {
      setIsRendering(true);
    }
  }, [currentSongId]);

  // Reset unblurred translations when blur is toggled off or song changes
  useEffect(() => {
    if (!blurTranslations) {
      setUnblurredTranslations(new Set());
    }
  }, [blurTranslations, currentSongId]);

  // Close word panel when switching songs
  useEffect(() => {
    setSelectedWord(null);
    setSelectedLine(null);
    setSelectedLineIndex(null);
  }, [currentSongId]);

  // Auto-hide toast after 2 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

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

  const handleWordPress = (word: string, line: string, lineIndex: number) => {
    const cleaned = removeSpecialChars(word);
    if (cleaned) {
      setSelectedWord(cleaned);
      setSelectedLine(line);
      setSelectedLineIndex(lineIndex);
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
    const textWords = text.split(/(\s+)/);
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {textWords.map((word, i) => {
          if (!word.trim()) {
            return <Text key={i} style={{ fontSize, lineHeight: fontSize * 1.6 }}>{word}</Text>;
          }

          const cleanedWord = removeSpecialChars(word);

          // Helper function to check if word has contracted prefix (e.g., j'viens)
          const hasContractedPrefix = (w: string) => contractedPrefixRegex.test(w);

          // Helper function to check if word has hyphenated prefix (e.g., mélan-mélanger)
          const hasHyphenatedPrefix = (w: string) => hyphenatedPrefixRegex.test(w);

          // For French words with prefixes, also try matching without the prefix
          // Check if original languages include French
          const hasFrenchLanguage = song?.originalLanguages?.some(
            lang => lang.toLowerCase() === 'french' || lang.toLowerCase() === 'fr'
          );

          let wordEntry = cleanedWord ? words.find((w) => w.word.toLowerCase() === cleanedWord.toLowerCase()) : null;

          // If no match found and the word has a contracted prefix and song has French, try without prefix
          if (!wordEntry && cleanedWord && hasContractedPrefix(cleanedWord) && hasFrenchLanguage) {
            const withoutPrefix = cleanedWord.slice(2); // Remove first letter and apostrophe
            wordEntry = words.find((w) => w.word.toLowerCase() === withoutPrefix.toLowerCase());
          }

          // If no match found and the word has a hyphenated prefix and song has French, try without prefix
          if (!wordEntry && cleanedWord && hasHyphenatedPrefix(cleanedWord) && hasFrenchLanguage) {
            const hyphenIndex = cleanedWord.indexOf('-');
            const withoutPrefix = cleanedWord.slice(hyphenIndex + 1); // Remove everything up to and including the hyphen
            wordEntry = words.find((w) => w.word.toLowerCase() === withoutPrefix.toLowerCase());
          }

          const isSelected = selectedWord && cleanedWord === selectedWord;

          // Get display content based on mode
          let displayContent = '';
          if (enableAnnotations && wordEntry && displayMode !== 'none') {
            if (displayMode === 'ipa' && wordEntry.pronunciation) {
              displayContent = wordEntry.pronunciation.includes('/')
                ? wordEntry.pronunciation
                : `/${wordEntry.pronunciation}/`;
            } else if (displayMode === 'definition' && wordEntry.definitions && wordEntry.definitions.length > 0) {
              displayContent = wordEntry.definitions[0].text;
            }
          }

          // Check if emoji is just the default flag for the language
          const shouldShowEmoji = enableAnnotations && showEmoji && wordEntry && wordEntry.emoji &&
            wordEntry.emoji !== getFlagForLanguage(wordEntry.language);

          return (
            <View key={i} style={{ alignItems: 'center' }}>
              {/* Always render annotation space to keep all words aligned */}
              <View style={styles.annotationSpace}>
                {shouldShowEmoji && (
                  <Text style={styles.wordAnnotation}>
                    {wordEntry?.emoji}
                  </Text>
                )}
                {displayContent && (
                  <Text style={styles.wordAnnotation} numberOfLines={1}>
                    {displayContent}
                  </Text>
                )}
              </View>
              <Text
                onPress={() => handleWordPress(word, text, lineIndex)}
                style={{
                  fontSize,
                  lineHeight: fontSize * 1.6,
                  color: isSelected ? Colors.primary : Colors.text,
                  fontWeight: isSelected ? '700' : '400',
                }}
              >
                {word}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }, [words, song?.originalLanguages, selectedWord, displayMode, enableAnnotations, showEmoji, fontSize]);

  if (!song) {
    return (
      <ScreenWrapper>
        <View style={styles.emptyInner}>
          <Ionicons name="musical-notes-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyText}>
            No lyrics to display.{'\n'}Go to Editor to add lyrics.
          </Text>
          <TouchableOpacity style={styles.goButton} onPress={() => navigation.navigate('Editor')}>
            <Text style={styles.goButtonText}>Go to Editor</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  /* ─── Word panel ──────────────────────────────────────── */
  const selectedWordEntry = selectedWord
    ? words.find((w) => w.word.toLowerCase() === selectedWord.toLowerCase())
    : null;

  // Get translation line for the selected line
  const selectedTranslationLine =
    selectedLineIndex !== null && lines[selectedLineIndex]
      ? lines[selectedLineIndex].translations
          .filter((tl) => tl.show && localSelectedLanguages.includes(tl.language))
          .map((tl) => tl.text)
          .join(' / ')
      : undefined;

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
          originalLanguages={song.originalLanguages}
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
      />
    ) : null;

  /* ─── Action bar ──────────────────────────────────────── */
  const actionBar = (
    <View style={styles.actionBar}>
      <View style={styles.fontSizeControl}>
        <Ionicons name="text-outline" size={18} color={Colors.textSecondary} />
        <TouchableOpacity onPress={() => setFontSize(fontSize - 1)} style={styles.fontBtn}>
          <Ionicons name="remove" size={18} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.fontSizeText}>{fontSize}</Text>
        <TouchableOpacity onPress={() => setFontSize(fontSize + 1)} style={styles.fontBtn}>
          <Ionicons name="add" size={18} color={Colors.text} />
        </TouchableOpacity>
      </View>
      <Text style={styles.lineCounter}>{lineCount} lines</Text>
    </View>
  );

  /* ─── Lyrics scroll ────────────────────────────────────── */
  const lyricsView = (
    <ScrollView style={styles.lyricsScroll} contentContainerStyle={styles.lyricsContent}>
      {lines.map((line, i) => (
        <View key={i} style={styles.lineBlock}>
          {renderPressableText(line.original, i)}
          {showTranslations &&
            line.translations
              .filter((tl) => tl.show && localSelectedLanguages.includes(tl.language))
              .map((tl, ti) => {
                const translationKey = `${i}-${ti}`;
                const isBlurred = blurTranslations && !unblurredTranslations.has(translationKey);
                return tl.text ? (
                  <TouchableOpacity
                    key={ti}
                    onPress={() => handleTranslationPress(i, ti)}
                    activeOpacity={blurTranslations ? 0.7 : 1}
                  >
                    <Text
                      style={[
                        styles.translationLine,
                        { fontSize: fontSize - 2 },
                        isBlurred && styles.blurredText,
                      ]}
                    >
                      {tl.text}
                    </Text>
                  </TouchableOpacity>
                ) : null;
              })}
        </View>
      ))}
    </ScrollView>
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
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowDropdown(true)}>
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
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          showEmoji={showEmoji}
          onShowEmojiChange={setShowEmoji}
          enableAnnotations={enableAnnotations}
          onEnableAnnotationsChange={setEnableAnnotations}
          blurTranslations={blurTranslations}
          onToggleBlur={toggleBlurTranslations}
        />
      )}

      {/* Toast notification */}
      {showToast && (
        <View style={styles.toastContainer}>
          <Toast message={toastMessage} />
        </View>
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
  emptyInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  goButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 24,
  },
  goButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
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
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fontSizeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fontBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 6,
  },
  fontSizeText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  lineCounter: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  lyricsScroll: {
    flex: 1,
  },
  lyricsContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  lineBlock: {
    marginBottom: 6,
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
  translationLine: {
    color: Colors.primaryLight,
    fontStyle: 'italic',
    lineHeight: 22,
    marginTop: 2,
  },
  blurredText: {
    filter: 'blur(5px)',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
});
