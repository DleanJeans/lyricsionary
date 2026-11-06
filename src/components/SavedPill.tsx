import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { Colors } from '../constants/theme';
import { Text } from './Text';

/** A "Saved" check that pops in beside a word just saved and stays while its card is open */
export default function SavedPill() {
  return (
    <Animated.View
      // The original pop (damping 12 is a 0.6 damping ratio), settled within a second
      entering={ZoomIn.springify(1000).dampingRatio(0.6)}
      exiting={FadeOut.duration(200)}
      style={styles.pill}
      accessibilityLabel="Saved"
    >
      <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
      <Text style={styles.text}>Saved</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: Colors.success + '26',
  },
  text: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
});
