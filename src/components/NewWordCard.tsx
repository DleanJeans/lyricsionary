import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { ReactNode, useMemo, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { isSameLanguage } from '../constants/languages';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { useWiktionaryPronunciation } from '../hooks/useWiktionaryPronunciation';
import { isWordIgnored, useStore } from '../store/useStore';
import { MasteryLevel } from '../types';
import {
  buildKnownGermanWords,
  getCompoundParts,
  getSplitPositions,
  isGermanLanguage,
  splitAtPositions,
} from '../utils/compoundWords';
import MasteryLevelDropdown from './MasteryLevelDropdown';
import PronunciationAudio from './PronunciationAudio';
import { Text } from './Text';
import WordTransformButtons from './WordTransformButtons';

interface NewWordCardProps {
  word: string;
  songId: string;
  songName: string;
  artistName: string;
  lyricsLine?: string;
  translationLine?: string;
  originalLanguages?: string[];
  onClose: () => void;
  isWide?: boolean;
  occurrence?: number;
  /** Shown under the actions in Learn, e.g. a quiz on the word's Wiktionary meaning */
  quiz?: ReactNode;
}

export default function NewWordCard({
  word,
  songId,
  songName,
  artistName,
  lyricsLine,
  translationLine,
  originalLanguages,
  onClose,
  isWide = false,
  occurrence,
  quiz,
}: NewWordCardProps) {
  const navigation = useNavigation<any>();
  const addOrUpdateWord = useStore((s) => s.addOrUpdateWord);
  const ignoredWords = useStore((s) => s.ignoredWords);
  const toggleIgnoredWord = useStore((s) => s.toggleIgnoredWord);
  const language = originalLanguages?.[0] || 'unknown';
  const isIgnored = isWordIgnored(ignoredWords, word, language);
  const wiktionary = useWiktionaryPronunciation(word, originalLanguages?.[0]);

  const words = useStore((s) => s.words);
  const compoundSplits = useStore((s) => s.compoundSplits);
  // Saved while the card is open, e.g. by answering its quiz
  const saved = words.find((w) => w.word.toLowerCase() === word.toLowerCase() && isSameLanguage(w.language, language));
  const setCompoundSplit = useStore((s) => s.setCompoundSplit);
  const isGerman = isGermanLanguage(originalLanguages);
  const knownGermanWords = useMemo(() => buildKnownGermanWords(words), [words]);
  const compoundParts = isGerman ? getCompoundParts(word, compoundSplits, knownGermanWords) : null;
  const [isEditingSplit, setIsEditingSplit] = useState(false);
  // Character positions the word is cut at while editing, e.g. [6] for Liebes|brief
  const [splitPositions, setSplitPositions] = useState<number[]>([]);
  const letters = Array.from(word);
  const splitPreview = splitAtPositions(word, splitPositions);

  const startEditingSplit = () => {
    setSplitPositions(compoundParts ? getSplitPositions(compoundParts.map((p) => p.text)) : []);
    setIsEditingSplit(true);
  };

  const toggleSplitAt = (position: number) => {
    setSplitPositions((positions) =>
      positions.includes(position) ? positions.filter((p) => p !== position) : [...positions, position]
    );
  };

  const saveSplit = () => {
    setCompoundSplit(word, splitPreview.length > 1 ? splitPreview : null);
    setIsEditingSplit(false);
  };

  const handleMasterySelect = async (level: MasteryLevel) => {
    // Keep the recordings so the saved word doesn't fetch them again
    await addOrUpdateWord(word, language, undefined, undefined, level, wiktionary.loaded ? wiktionary.audio : undefined);
    onClose();
  };

  const handleLookupOriginalWord = () => {
    navigation.navigate('WordLookup', {
      word,
      songId,
      songName,
      artistName,
      lyricsLine,
      translationLine,
      originalLanguages,
      source: 'Learn',
      occurrence,
      ipa: wiktionary.ipa,
    });
  };

  const showSplit = isGerman && !isIgnored;

  return (
    <View style={[styles.wordPanel, styles.wordPanelPadded, isWide && styles.wordPanelWide]}>
      <View style={styles.wordHeader}>
        <View style={styles.wordTitle}>
          {/* A word saved from its quiz isn't new; the Save button shows its level */}
          {!saved && (
            <View style={[styles.badge, isIgnored && styles.ignoredBadge]}>
              <Text style={styles.badgeText}>{isIgnored ? 'IGNORED' : 'NEW'}</Text>
            </View>
          )}
          <Text style={[styles.wordText, isIgnored && styles.ignoredWordText]}>{word}</Text>
        </View>
        <View style={styles.headerTools}>
          {showSplit && !isEditingSplit && (
            <TouchableOpacity
              accessibilityLabel="Split Compound Word"
              style={styles.toolButton}
              onPress={startEditingSplit}
              hitSlop={4}
            >
              <Ionicons name="cut-outline" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            accessibilityLabel={isIgnored ? 'Unignore Word' : 'Ignore Word'}
            style={styles.toolButton}
            onPress={() => toggleIgnoredWord(word, language)}
            hitSlop={4}
          >
            <Ionicons name={isIgnored ? 'eye-outline' : 'eye-off-outline'} size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Close" style={styles.toolButton} onPress={onClose} hitSlop={4}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
      {(wiktionary.ipa.length > 0 || wiktionary.audio.length > 0) && (
        <View style={styles.ipaRow}>
          {wiktionary.ipa.length > 0 && <Text style={styles.ipaText}>{wiktionary.ipa.join(', ')}</Text>}
          <PronunciationAudio audio={wiktionary.audio} compact />
        </View>
      )}
      {showSplit && compoundParts && !isEditingSplit && (
        <Text style={styles.compoundText}>{compoundParts.map((p) => p.text).join(' · ')}</Text>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          accessibilityLabel="Search New Word"
          style={[styles.chip, styles.chipFilled, styles.chipGrow]}
          onPress={handleLookupOriginalWord}
        >
          <Ionicons name="search" size={16} color={Colors.white} />
          <Text style={[styles.chipText, styles.chipTextFilled]}>Look up</Text>
        </TouchableOpacity>
        {!isIgnored && (
          <MasteryLevelDropdown
            onSelect={handleMasterySelect}
            label={saved ? `Saved · ${saved.masteryLevel ?? 'Seen'}` : 'Save'}
            triggerStyle={[styles.chip, styles.chipGrow]}
            labelStyle={[styles.chipText, saved && { color: getMasteryLevelColor(saved.masteryLevel) }]}
            showChevron
          />
        )}
      </View>

      {isEditingSplit && (
        <View style={styles.splitEditor}>
          <Text style={styles.splitHint}>Tap between letters to split the word</Text>
          <View style={styles.letterRow}>
            {letters.map((letter, i) => {
              // Alternate colours so each part of the split stands out
              const partIndex = splitPositions.filter((p) => p <= i).length;
              return (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <TouchableOpacity
                      accessibilityLabel={`Split before letter ${i + 1}`}
                      style={styles.splitGap}
                      hitSlop={{ top: 8, bottom: 8 }}
                      onPress={() => toggleSplitAt(i)}
                    >
                      <View style={[styles.splitLine, splitPositions.includes(i) && styles.splitLineActive]} />
                    </TouchableOpacity>
                  )}
                  <Text style={[styles.splitLetter, partIndex % 2 === 1 && styles.splitLetterAlt]}>{letter}</Text>
                </React.Fragment>
              );
            })}
          </View>
          <View style={styles.splitActions}>
            <Text style={styles.splitPreview}>
              {splitPreview.length > 1 ? splitPreview.join(' + ') : 'Not split'}
            </Text>
            <TouchableOpacity
              accessibilityLabel="Cancel Split"
              style={[styles.chip, styles.chipSecondary]}
              onPress={() => setIsEditingSplit(false)}
            >
              <Ionicons name="close" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Save Split" style={styles.chip} onPress={saveSplit}>
              <Ionicons name="checkmark" size={16} color={Colors.primary} />
              <Text style={styles.chipText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {quiz}

      <WordTransformButtons
        word={word}
        songId={songId}
        songName={songName}
        artistName={artistName}
        lyricsLine={lyricsLine}
        translationLine={translationLine}
        originalLanguages={originalLanguages}
        source="Learn"
        hideOriginalWord
        compact
        extraWords={showSplit ? compoundParts?.map((p) => p.lookup) : undefined}
      />
    </View>
  );
}

// Let long words (e.g. German compounds) wrap on web, where unbreakable words overflow by default
const webWordBreak = Platform.OS === 'web' ? ({ wordBreak: 'break-word' } as object) : {};

const styles = StyleSheet.create({
  wordPanel: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
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
    alignItems: 'flex-start',
    gap: 12,
  },
  wordTitle: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  wordText: {
    ...webWordBreak,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  ignoredWordText: {
    color: Colors.textSecondary,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.success,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ignoredBadge: {
    backgroundColor: Colors.textMuted,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  ipaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  ipaText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  compoundText: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  headerTools: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -6,
    marginRight: -6,
  },
  toolButton: {
    padding: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    zIndex: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  chipFilled: {
    backgroundColor: Colors.primary,
  },
  chipGrow: {
    flex: 1,
    justifyContent: 'center',
  },
  chipSecondary: {
    borderColor: Colors.border,
  },
  chipText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextFilled: {
    color: Colors.white,
  },
  chipTextSecondary: {
    color: Colors.textSecondary,
  },
  splitEditor: {
    marginTop: 12,
    gap: 8,
  },
  splitHint: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  letterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
  },
  splitLetter: {
    color: Colors.text,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
  },
  splitLetterAlt: {
    color: Colors.primary,
  },
  splitGap: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitLine: {
    width: 1,
    height: 20,
    backgroundColor: Colors.textMuted,
    opacity: 0.5,
  },
  splitLineActive: {
    width: 3,
    height: 30,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    opacity: 1,
  },
  splitActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  splitPreview: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
