import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { getFlagForLanguage } from '../constants/languages';
import { Colors } from '../constants/theme';
import { WordEntry } from '../types';
import HighlightedText from './HighlightedText';
import { Text } from './Text';

interface WordCardProps {
  item: WordEntry;
  isWide?: boolean;
  searchQuery?: string;
  showDelete?: boolean;
  showClose?: boolean;
  onClose?: () => void;
  onDelete?: (item: WordEntry, close: () => void) => void;
  source?: 'Learn' | 'Words';
  songId?: string;
  songName?: string;
  artistName?: string;
  lyricsLine?: string;
  translationLine?: string;
  originalLanguages?: string[];
  occurrence?: number;
}

export default function WordCard({
  item,
  isWide = false,
  searchQuery = '',
  showDelete = true,
  showClose = false,
  onClose,
  onDelete,
  source,
  songId,
  songName,
  artistName,
  lyricsLine,
  translationLine,
  originalLanguages,
  occurrence,
}: WordCardProps) {
  const navigation = useNavigation<any>();
  const swipeableRef = useRef<Swipeable>(null);
  const ipa = item.pronunciation.includes('/') ? item.pronunciation : `/${item.pronunciation}/`;

  const handleCardPress = () => {
    navigation.navigate('WordLookup', {
      word: item.word,
      songId,
      songName,
      artistName,
      lyricsLine,
      translationLine,
      originalLanguages,
      source,
      occurrence,
    });
  };

  const renderLeftActions = () => {
    if (!showDelete) return null;

    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete?.(item, () => swipeableRef.current?.close())}
        activeOpacity={0.7}
      >
        <Ionicons name="trash" size={24} color={Colors.white} />
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      overshootLeft={false}
    >
      <TouchableOpacity
        style={[styles.card, isWide && styles.cardWide]}
        onPress={handleCardPress}
        activeOpacity={1}
      >
        {showClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
        <View style={styles.cardRow}>
          <Text style={styles.flag}>{(item.contexts?.[0]?.emoji || item.emoji) || getFlagForLanguage(item.language)}</Text>
          <View style={styles.cardContent}>
            <HighlightedText
              text={item.word}
              query={searchQuery}
              style={styles.cardWordText}
            />
            {item.pronunciation ? (
              <HighlightedText
                text={ipa}
                query={searchQuery}
                style={styles.pronunciation}
              />
            ) : null}
          </View>

        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardWide: {
    flex: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardWordText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  pronunciation: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: Colors.dangerDark,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    marginBottom: 10,
    marginRight: -28,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    paddingRight: 28,
  },
  deleteButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
