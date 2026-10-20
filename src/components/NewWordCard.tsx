import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { isWordIgnored, useStore } from '../store/useStore';
import { MasteryLevel } from '../types';
import { buildKnownGermanWords, getCompoundParts, isGermanLanguage, parseManualSplit } from '../utils/compoundWords';
import MasteryLevelDropdown from './MasteryLevelDropdown';
import { Text, TextInput } from './Text';
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
}: NewWordCardProps) {
  const navigation = useNavigation<any>();
  const addOrUpdateWord = useStore((s) => s.addOrUpdateWord);
  const ignoredWords = useStore((s) => s.ignoredWords);
  const toggleIgnoredWord = useStore((s) => s.toggleIgnoredWord);
  const language = originalLanguages?.[0] || 'unknown';
  const isIgnored = isWordIgnored(ignoredWords, word, language);

  const words = useStore((s) => s.words);
  const compoundSplits = useStore((s) => s.compoundSplits);
  const setCompoundSplit = useStore((s) => s.setCompoundSplit);
  const isGerman = isGermanLanguage(originalLanguages);
  const knownGermanWords = useMemo(() => buildKnownGermanWords(words), [words]);
  const compoundParts = isGerman ? getCompoundParts(word, compoundSplits, knownGermanWords) : null;
  const [isEditingSplit, setIsEditingSplit] = useState(false);
  const [splitInput, setSplitInput] = useState('');

  const startEditingSplit = () => {
    setSplitInput(compoundParts ? compoundParts.map((p) => p.text).join('-') : word);
    setIsEditingSplit(true);
  };

  const saveSplit = () => {
    setCompoundSplit(word, parseManualSplit(word, splitInput));
    setIsEditingSplit(false);
  };

  const handleMasterySelect = async (level: MasteryLevel) => {
    await addOrUpdateWord(word, language, '', [], level);
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
    });
  };

  const showSplit = isGerman && !isIgnored;

  return (
    <View style={[styles.wordPanel, styles.wordPanelPadded, isWide && styles.wordPanelWide]}>
      <View style={styles.wordHeader}>
        <View style={styles.wordTitle}>
          <View style={[styles.badge, isIgnored && styles.ignoredBadge]}>
            <Text style={styles.badgeText}>{isIgnored ? 'IGNORED' : 'NEW'}</Text>
          </View>
          <Text style={[styles.wordText, isIgnored && styles.ignoredWordText]}>{word}</Text>
          {showSplit && compoundParts && !isEditingSplit && (
            <Text style={styles.compoundText}>{compoundParts.map((p) => p.text).join(' · ')}</Text>
          )}
        </View>
        <TouchableOpacity accessibilityLabel="Close" onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity accessibilityLabel="Search New Word" style={styles.chip} onPress={handleLookupOriginalWord}>
          <Ionicons name="search" size={16} color={Colors.primary} />
          <Text style={styles.chipText}>Look up</Text>
        </TouchableOpacity>
        {!isIgnored && (
          <MasteryLevelDropdown
            onSelect={handleMasterySelect}
            label="Save"
            triggerStyle={styles.chip}
            labelStyle={styles.chipText}
          />
        )}
        <TouchableOpacity
          accessibilityLabel={isIgnored ? 'Unignore Word' : 'Ignore Word'}
          style={[styles.chip, styles.chipSecondary]}
          onPress={() => toggleIgnoredWord(word, language)}
        >
          <Ionicons name={isIgnored ? 'eye-outline' : 'eye-off-outline'} size={16} color={Colors.textSecondary} />
          {isIgnored && <Text style={[styles.chipText, styles.chipTextSecondary]}>Unignore</Text>}
        </TouchableOpacity>
        {showSplit && !isEditingSplit && (
          <TouchableOpacity accessibilityLabel="Split Compound Word" style={[styles.chip, styles.chipSecondary]} onPress={startEditingSplit}>
            <Ionicons name="cut-outline" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {isEditingSplit && (
        <View style={styles.splitRow}>
          <TextInput
            style={styles.splitInput}
            value={splitInput}
            onChangeText={setSplitInput}
            onSubmitEditing={saveSplit}
            placeholder="Split with hyphens, e.g. Liebes-brief"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          <TouchableOpacity accessibilityLabel="Save Split" style={styles.chip} onPress={saveSplit}>
            <Ionicons name="checkmark" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      )}

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
  compoundText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  chipSecondary: {
    borderColor: Colors.border,
  },
  chipText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSecondary: {
    color: Colors.textSecondary,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  splitInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingVertical: 4,
  },
});
