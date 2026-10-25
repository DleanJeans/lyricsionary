import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { MasteryLevel } from '../types';
import { Text } from './Text';

interface MasteryLevelBadgeProps {
  level?: MasteryLevel;
  /** An unsaved word, whose picker saves it at the level picked */
  isNew?: boolean;
  /** Whether the level picker it opens is showing */
  open: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/** A saved word's level in its color, tapped to show or hide a level picker in the card */
export default function MasteryLevelBadge({ level = 'Seen', isNew = false, open, onPress, style }: MasteryLevelBadgeProps) {
  return (
    <TouchableOpacity
      style={[styles.badge, { backgroundColor: isNew ? Colors.success : getMasteryLevelColor(level) }, style]}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isNew ? 'New word: save at a level' : `Level: ${level}`}
      accessibilityState={{ expanded: open }}
    >
      <Text style={[styles.text, isNew && styles.newText]}>{isNew ? 'NEW' : level.toUpperCase()}</Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={10} color={isNew ? Colors.white : Colors.background} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: '700',
  },
  newText: {
    color: Colors.white,
  },
});
