import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
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

  return (
    <View style={[styles.wordPanel, styles.wordPanelPadded, isWide && styles.wordPanelWide]}>
      <View style={styles.wordHeader}>
        <View style={styles.wordTitleRow}>
          <Text style={styles.wordText}>{word}</Text>
          <View style={[styles.newBadge, isIgnored && styles.ignoredBadge]}>
            <Text style={styles.newBadgeText}>{isIgnored ? 'IGNORED' : 'NEW'}</Text>
          </View>
          <TouchableOpacity accessibilityLabel="Search New Word" style={styles.searchButton} onPress={handleLookupOriginalWord}>
            <Ionicons name="search" size={16} color={Colors.primary} />
          </TouchableOpacity>
          <MasteryLevelDropdown onSelect={handleMasterySelect} />
          <TouchableOpacity
            accessibilityLabel={isIgnored ? 'Unignore Word' : 'Ignore Word'}
            style={styles.searchButton}
            onPress={() => toggleIgnoredWord(word, language)}
          >
            <Ionicons name={isIgnored ? 'eye-outline' : 'eye-off-outline'} size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
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
        extraWords={compoundParts?.map((p) => p.lemma)}
      />
      {isGerman && (
        <View style={styles.compoundRow}>
          <TouchableOpacity accessibilityLabel="Split Compound Word" style={styles.splitButton} onPress={isEditingSplit ? saveSplit : startEditingSplit}>
            <Ionicons name={isEditingSplit ? 'checkmark' : 'cut-outline'} size={16} color={Colors.primary} />
          </TouchableOpacity>
          {isEditingSplit ? (
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
          ) : (
            <Text style={styles.compoundText} numberOfLines={1}>
              {compoundParts ? compoundParts.map((p) => p.text).join(' · ') : 'Split compound word'}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

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
    alignItems: 'center',
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
    marginBottom: -4,
  },
  ignoredBadge: {
    backgroundColor: Colors.textMuted,
  },
  newBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  compoundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  splitButton: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  splitInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingVertical: 4,
  },
  compoundText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  searchButton: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginLeft: 4,
    marginBottom: -4,
  },
});
