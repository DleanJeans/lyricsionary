import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { Colors } from '../constants/theme';
import { getFlagForLanguage } from '../constants/languages';
import { WordEntry } from '../types';
import HighlightedText from './HighlightedText';
import { useNavigation } from '@react-navigation/native';

interface WordCardProps {
  item: WordEntry;
  isWide?: boolean;
  searchQuery?: string;
  showDelete?: boolean;
  showClose?: boolean;
  onClose?: () => void;
  onDelete?: (item: WordEntry, close: () => void) => void;
  onEdit?: (item: WordEntry) => void;
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
  onEdit,
  source,
  songId,
  songName,
  artistName,
  lyricsLine,
  originalLanguages,
}: WordCardProps) {
  const navigation = useNavigation<any>();
  const swipeableRef = useRef<Swipeable>(null);
  const ipa = item.pronunciation.includes('/') ? item.pronunciation : `/${item.pronunciation}/`;

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleLookup = () => {
    navigation.navigate('WordLookup', {
      word: item.word,
      songId,
      songName,
      artistName,
      lyricsLine,
      originalLanguages,
      source,
    });
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(item);
    } else {
      // Default edit behavior - navigate to WordLookup screen
      navigation.navigate('WordLookup', {
        word: item.word,
        source,
      });
    }
  };

  const handleCardPress = () => {
    // Animate showing renderRightActions
    if (swipeableRef.current) {
      swipeableRef.current.openRight();
    }
  };

  const renderLeftActions = () => {
    if (!showDelete) return null;

    return (
      <View style={{ justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete?.(item, () => swipeableRef.current?.close())}
          activeOpacity={0.7}
        >
          <Ionicons name="trash" size={24} color={Colors.white} />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRightActions = () => {
    return (
      <View style={{ justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEdit}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={24} color={Colors.white} />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const isNewWord = item.lookupCount === 1;

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[styles.card, isWide && styles.cardWide]}
        onPress={handleCardPress}
        activeOpacity={1}
      >
        <View style={styles.cardRow}>
          {showClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
          <Text style={styles.flag}>{item.emoji || getFlagForLanguage(item.language)}</Text>
          <View style={styles.cardContent}>
            <View style={styles.wordRow}>
              <HighlightedText
                text={item.word}
                query={searchQuery}
                style={styles.cardWordText}
              />
              {isNewWord && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>
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
            <Text style={styles.date}>{formatDate(item.lastLookedUp)}</Text>
          </View>
        </View>
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.lookupButton} onPress={handleLookup}>
            <Ionicons name="search" size={18} color={Colors.white} />
            <Text style={styles.lookupButtonText}>Look up</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
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
    marginRight: 8,
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardWordText: {
    fontSize: 18,
    fontWeight: '600',
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
  pronunciation: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
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
  buttonsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  lookupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  lookupButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
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
    height: '100%',
  },
  deleteButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  editButton: {
    backgroundColor: Colors.blue,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    marginBottom: 10,
    marginLeft: -28,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    paddingLeft: 28,
    height: '100%',
  },
  editButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
