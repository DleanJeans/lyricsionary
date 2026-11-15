import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/theme';
import { Text } from './Text';

/** For a listening quiz that can't be answered when the recording won't play, e.g. with no internet */
export default function SwitchQuizButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={8}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Can't play audio? Try another quiz"
    >
      <Ionicons name="swap-horizontal" size={14} color={Colors.textSecondary} />
      <Text style={styles.text}>Can't play audio? Try another quiz</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  text: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
});
