import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';
import type { WordEntry } from '../types';
import { dueLabel, nextDueAt } from '../utils/wordQuiz';
import { Text } from './Text';

/**
 * On a saved word's card: when its next quiz counts; nothing when it's due (the quiz shows) or Known.
 * Inline, it sits at the end of a row, e.g. a quiz's "Right!", pushed to the right.
 */
export default function DueLabel({ entry, inline = false }: { entry: WordEntry; inline?: boolean }) {
  const now = Date.now();
  const dueAt = nextDueAt(entry, now);
  if (dueAt === null || dueAt <= now) return null;
  return (
    <View style={[styles.row, inline && styles.inline]}>
      <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
      <Text style={styles.text}>{dueLabel(dueAt, now)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  inline: { marginTop: 0, marginLeft: 'auto' },
  text: { fontSize: 12, color: Colors.textMuted },
});
