import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { Colors } from '../constants/theme';
import { getFlagForLanguage } from '../constants/languages';
import { WordEntry } from '../types';
import HighlightedText from './HighlightedText';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/useStore';

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
  originalLanguages?: string[];
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
}: WordCardProps) {
  const navigation = useNavigation<any>();
  const swipeableRef = useRef<Swipeable>(null);
  const { incrementWordLookupCount } = useStore();
  const ipa = item.pronunciation.includes('/') ? item.pronunciation : `/${item.pronunciation}/`;

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleCardPress = () => {
    incrementWordLookupCount(item.id);
    navigation.navigate('WordLookup', {
      word: item.word,
      source,
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
          <Text style={styles.flag}>{item.emoji || getFlagForLanguage(item.language)}</Text>
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
          <View style={styles.cardRight}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.lookupCount}×</Text>
            </View>
            {/* <Text style={styles.date}>{formatDate(item.lastLookedUp)}</Text> */}
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
  cardRight: {
    display: 'flex',
    flexDirection: 'row',
    
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 20,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  date: {
    fontSize: 12,
    color: Colors.textMuted,
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
