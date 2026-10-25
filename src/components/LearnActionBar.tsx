import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import type { WordProgress } from '../hooks/useWordProgress';
import IconButton from './IconButton';
import { Text } from './Text';

interface LearnActionBarProps {
  fontSize: number;
  lineCount: number;
  /** Known (saved or ignored) words out of the song's words, shown as text and a bar */
  wordProgress?: WordProgress;
  onDecreaseFontSize: () => void;
  onIncreaseFontSize: () => void;
}

export default function LearnActionBar({
  fontSize,
  lineCount,
  wordProgress,
  onDecreaseFontSize,
  onIncreaseFontSize,
}: LearnActionBarProps) {
  const canDecrease = fontSize > 12;
  const canIncrease = fontSize < 32;

  return (
    <View style={styles.actionBar}>
      <View style={styles.fontSizeControl}>
        <Ionicons
          name="text-outline"
          size={18}
          color={Colors.textSecondary}
        />
        <IconButton
          icon="remove"
          label="Decrease text size"
          onPress={onDecreaseFontSize}
          disabled={!canDecrease}
          style={styles.fontButton}
        />
        <Text style={styles.fontSizeText}>{fontSize}</Text>
        <IconButton
          icon="add"
          label="Increase text size"
          onPress={onIncreaseFontSize}
          disabled={!canIncrease}
          style={styles.fontButton}
        />
      </View>
      <Text style={styles.lineCounter} numberOfLines={1}>
        {wordProgress ? `${wordProgress.label} · ${lineCount} lines` : `${lineCount} lines`}
      </Text>
      {wordProgress && (
        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityLabel="Known words"
          accessibilityValue={{ min: 0, max: wordProgress.total, now: wordProgress.known }}
        >
          <View style={[styles.progressFill, { width: `${wordProgress.percent}%` }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  fontButton: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fontSizeText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  // Sits on the bar's bottom border so it takes no extra height
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 3,
    backgroundColor: Colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  lineCounter: {
    flexShrink: 1,
    marginLeft: 12,
    color: Colors.textSecondary,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
});
