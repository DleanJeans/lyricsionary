import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import IconButton from './IconButton';
import { Text } from './Text';

interface LearnActionBarProps {
  fontSize: number;
  lineCount: number;
  /** Known words out of the song's words, e.g. "12/40 words (30%)" */
  wordProgress?: string;
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
        {wordProgress ? `${wordProgress} · ${lineCount} lines` : `${lineCount} lines`}
      </Text>
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
  lineCounter: {
    flexShrink: 1,
    marginLeft: 12,
    color: Colors.textSecondary,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
});
