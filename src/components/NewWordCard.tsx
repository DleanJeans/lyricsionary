import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/theme';
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
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
          <TouchableOpacity accessibilityLabel="Search New Word" style={styles.searchButton} onPress={handleLookupOriginalWord}>
            <Ionicons name="search" size={16} color={Colors.primary} />
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
        />
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
  newBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
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
