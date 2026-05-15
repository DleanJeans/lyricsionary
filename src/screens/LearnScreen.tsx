import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Colors } from '../constants/theme';
import { getFlagForLanguage } from '../constants/languages';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../components/ScreenWrapper';
import { useIsWide } from '../hooks/useLayout';
import { useBackToQuit } from '../hooks/useBackToQuit';
import MultiLanguageSelect from '../components/MultiLanguageSelect';
import Toast from '../components/Toast';
import WordCard from '../components/WordCard';
import { removeSpecialChars } from '../utils/cleanLyrics';

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
    selectedTranslationLanguages,
    setSelectedTranslationLanguages,
    blurTranslations,
    toggleBlurTranslations,
  } = useStore();

  const song = songs.find((s) => s.id === currentSongId);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [unblurredTranslations, setUnblurredTranslations] = useState<Set<string>>(new Set());

  // Initialize selected languages when song changes
  useEffect(() => {
    if (song && song.translations.length > 0 && selectedTranslationLanguages.length === 0) {
      // Auto-select all available translation languages by default
      const availableLanguages = song.translations.map((t) => t.language);
      setSelectedTranslationLanguages(availableLanguages);
    }
  }, [song, selectedTranslationLanguages.length, setSelectedTranslationLanguages]);

  // Reset unblurred translations when blur is toggled off or song changes
  useEffect(() => {
    if (!blurTranslations) {
      setUnblurredTranslations(new Set());
    }
  }, [blurTranslations, currentSongId]);

  // Auto-hide toast after 2 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Helper function to normalize text for comparison (remove punctuation, compare words only)
  const normalizeText = (text: string): string => {
    return text
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .trim()
      .toLowerCase();
  };

  const lines = useMemo(() => {
    if (!song) return [];
    const originalLines = song.originalLyrics.split('\n');
    const translationLines = song.translations.map((t) => t.lyrics.split('\n'));
    return originalLines.map((line, i) => {
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
  }, [song]);

  const lineCount = lines.length;

  const handleToggleTranslations = () => {
    if (!song || song.translations.length === 0) {
      setToastMessage('No translations available');
      setShowToast(true);
      return;
    }
    setShowDropdown(true);
  };

  const handleLanguageChange = (languages: string[]) => {
    setSelectedTranslationLanguages(languages);
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



  const handleWordPress = (word: string, line: string) => {
    const cleaned = removeSpecialChars(word);
    if (cleaned) {
      setSelectedWord(cleaned);
      setSelectedLine(line);
    }
  };

  const handleTranslationPress = (lineIndex: number, translationIndex: number) => {
    const key = `${lineIndex}-${translationIndex}`;
    if (blurTranslations && !unblurredTranslations.has(key)) {
      setUnblurredTranslations((prev) => new Set(prev).add(key));
    }
  };

  const renderPressableText = (text: string) => {
    const words = text.split(/(\s+)/);
    return (
      <Text style={{ fontSize, lineHeight: fontSize * 1.6, color: Colors.text }}>
        {words.map((word, i) =>
          word.trim() ? (
            <Text
              key={i}
              onPress={() => handleWordPress(word, text)}
              style={
                selectedWord && removeSpecialChars(word) === selectedWord
                  ? {
                      color: Colors.primary,
                      fontWeight: '700',
                    }
                  : {
                      color: Colors.text,
                      fontWeight: '400',
                    }
              }
            >
              {word}
            </Text>
          ) : (
            <Text key={i}>{word}</Text>
          ),
        )}
      </Text>
    );
  };

  /* ─── Word panel ──────────────────────────────────────── */
  const selectedWordEntry = selectedWord
    ? words.find((w) => w.word.toLowerCase() === selectedWord.toLowerCase())
    : null;

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
      <View style={[styles.wordPanel, styles.wordPanelPadded, isWide && styles.wordPanelWide]}>
        <View style={styles.wordHeader}>
          <View style={styles.wordTitleRow}>
            <Text style={styles.wordText}>{selectedWord}</Text>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setSelectedWord(null)}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.lookupNewButton}
          onPress={() => {
            navigation.navigate('WordLookup', {
              word: selectedWord,
              songId: song.id,
              songName: song.songName,
              artistName: song.artistName,
              lyricsLine: selectedLine ?? undefined,
              originalLanguages: song.originalLanguages,
              source: 'Learn',
            });
          }}
        >
          <Ionicons name="search" size={18} color={Colors.white} />
          <Text style={styles.lookupNewButtonText}>Look up</Text>
        </TouchableOpacity>
      </View>
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
          {renderPressableText(line.original)}
          {showTranslations &&
            line.translations
              .filter((tl) => tl.show && selectedTranslationLanguages.includes(tl.language))
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
          <View style={styles.songNameRow}>
            <Text style={styles.songName} numberOfLines={1}>
              {song.songName}
            </Text>
            <View style={styles.headerFlags}>
              {(song.originalLanguages ?? []).map((lang) => (
                <Text key={`orig-${lang}`} style={styles.flag}>
                  {getFlagForLanguage(lang)}
                </Text>
              ))}
            </View>
          </View>
          <Text style={styles.artistName}>{song.artistName}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleToggleTranslations}>
            <Ionicons
              name={showTranslations ? 'language' : 'eye-off-outline'}
              size={22}
              color={Colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={toggleBlurTranslations}>
            <Ionicons
              name={blurTranslations ? 'eye-outline' : 'eye-off'}
              size={22}
              color={Colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Editor', { songId: song.id })}
          >
            <Ionicons name="create-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Translation language selector modal */}
      {song && song.translations.length > 0 && (
        <MultiLanguageSelect
          value={selectedTranslationLanguages}
          onValueChange={handleLanguageChange}
          placeholder="Select translation languages"
          availableLanguages={song.translations.map((t) => t.language)}
          showModal={showDropdown}
          hideInput
          onClose={() => setShowDropdown(false)}
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
  songNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  headerFlags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  flag: {
    fontSize: 14,
  },
  songName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  artistName: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 2,
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
  wordCardContainer: {
    marginHorizontal: 16,
  },
  wordPanel: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wordPanelPadded: {
    padding: 16,
  },
  wordPanelWide: {
    marginHorizontal: 0,
    marginBottom: 0,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  wordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  newBadge: {
    backgroundColor: Colors.success,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  lookupNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  lookupNewButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
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
