import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Colors } from '../constants/theme';

interface WordSpotStepperProps {
  /** How many times the word comes up in the song */
  count: number;
  /** Which of them is selected, or -1 */
  index: number;
  onStep: (step: 1 | -1) => void;
  /** In the word sheet: just "1 of 4" between the arrows, at the end of the merge hint's row */
  compact?: boolean;
}

/** Above the word card: how often the word comes up in this song, and arrows to step through those lines */
export default function WordSpotStepper({ count, index, onStep, compact = false }: WordSpotStepperProps) {
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <TouchableOpacity
        onPress={() => onStep(-1)}
        style={styles.arrow}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Previous line with this word"
      >
        <Ionicons name="chevron-back" size={18} color={Colors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onStep(1)} accessibilityRole="button" accessibilityLabel="Next line with this word">
        <Text style={styles.label}>
          {compact
            ? (index >= 0 ? `${index + 1} of ${count}` : `${count} times`)
            : index >= 0 ? `${index + 1} of ${count} in this song` : `${count} times in this song`}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onStep(1)}
        style={styles.arrow}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Next line with this word"
      >
        <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  rowCompact: {
    marginHorizontal: 0,
    marginBottom: 0,
    marginLeft: 'auto',
    gap: 0,
  },
  arrow: {
    padding: 4,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
