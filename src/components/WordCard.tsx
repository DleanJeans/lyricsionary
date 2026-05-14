import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/theme';
import { getFlagForLanguage } from '../constants/languages';
import { WordEntry } from '../types';

interface WordCardProps {
  word: WordEntry;
  onLongPress?: () => void;
  showCloseButton?: boolean;
  onClose?: () => void;
  isExpanded?: boolean;
  onPress?: () => void;
  songId?: string;
  songName?: string;
  artistName?: string;
  lyricsLine?: string;
  originalLanguages?: string[];
  source?: 'Learn' | 'Words';
  children?: React.ReactNode;
}

export default function WordCard({
  word,
  onLongPress,
  showCloseButton,
  onClose,
  isExpanded,
  onPress,
  songId,
  songName,
  artistName,
  lyricsLine,
  originalLanguages,
  source,
  children,
}: WordCardProps) {
  const navigation = useNavigation<any>();
  const translateX = useRef(new Animated.Value(0)).current;

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
      // Animate swipe left to reveal edit button
      Animated.spring(translateX, {
        toValue: -80,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }).start(() => {
        // Auto-hide after 2 seconds
        setTimeout(() => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 40,
            friction: 7,
          }).start();
        }, 2000);
      });
    }
  };

  const handleEditPress = () => {
    navigation.navigate('WordLookup', {
      word: word.word,
      songId,
      songName,
      artistName,
      lyricsLine,
      originalLanguages,
      source,
    });
  };

  const ipa = word.pronunciation.includes('/') ? word.pronunciation : `/${word.pronunciation}/`;

  return (
    <View style={styles.container}>
      {/* Edit button background (revealed on swipe left) */}
      <View style={styles.editBackground}>
        <TouchableOpacity style={styles.editButton} onPress={handleEditPress}>
          <Ionicons name="create-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Main card content */}
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={handlePress}
          onLongPress={onLongPress}
          activeOpacity={0.7}
        >
          <View style={styles.cardRow}>
            <Text style={styles.flag}>{word.emoji || getFlagForLanguage(word.language)}</Text>
            <View style={styles.cardContent}>
              <Text style={styles.cardWordText}>{word.word}</Text>
              {word.pronunciation ? (
                <Text style={styles.pronunciation}>{ipa}</Text>
              ) : null}
            </View>
            <View style={styles.cardRight}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{word.lookupCount}×</Text>
              </View>
              <Text style={styles.date}>{formatDate(word.lastLookedUp)}</Text>
            </View>
            {showCloseButton && onClose && (
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          {isExpanded && children && (
            <View style={styles.expandedContent}>{children}</View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 10,
  },
  editBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 80,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
