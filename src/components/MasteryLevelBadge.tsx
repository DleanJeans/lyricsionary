import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { MasteryLevel } from '../types';
import { Text } from './Text';

interface MasteryLevelBadgeProps {
  level?: MasteryLevel;
  /** Whether the level picker it opens is showing */
  open: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/** A saved word's level in its color, tapped to show or hide a level picker in the card */
export default function MasteryLevelBadge({ level = 'Seen', open, onPress, style }: MasteryLevelBadgeProps) {
  return (
    <TouchableOpacity
      style={[styles.badge, { backgroundColor: getMasteryLevelColor(level) }, style]}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Level: ${level}`}
      accessibilityState={{ expanded: open }}
    >
      <Text style={styles.text}>{level.toUpperCase()}</Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={10} color={Colors.background} />
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
});
