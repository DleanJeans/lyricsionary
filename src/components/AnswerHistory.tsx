import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import type { WordEvent } from '../types';
import { describeWordEvent, formatEventDay } from '../utils/wordHistory';

const SHOWN_AT_FIRST = 5;

function EventIcon({ event }: { event: WordEvent }) {
  if (event.kind) {
    return event.correct
      ? <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
      : <Ionicons name="close-circle" size={16} color={Colors.danger} />;
  }
  return <Ionicons name={event.saved ? 'bookmark' : 'swap-vertical'} size={16} color={getMasteryLevelColor(event.level)} />;
}

/** On a saved word's page: its quiz answers and level changes, newest first */
export default function AnswerHistory({ history }: { history: WordEvent[] }) {
  const [showAll, setShowAll] = useState(false);
  const now = Date.now();
  const newestFirst = [...history].reverse();
  const shown = showAll ? newestFirst : newestFirst.slice(0, SHOWN_AT_FIRST);
  const answers = history.filter((e) => e.kind);
  const right = answers.filter((e) => e.correct).length;

  return (
    <View style={styles.container}>
      {answers.length > 0 && (
        <Text style={styles.summary}>
          {right} right, {answers.length - right} wrong
        </Text>
      )}
      {shown.map((event, i) => (
        <View key={`${event.at}-${i}`} style={styles.row}>
          <EventIcon event={event} />
          <Text style={[styles.text, event.level && { color: getMasteryLevelColor(event.level) }]} numberOfLines={1}>
            {describeWordEvent(event)}
          </Text>
          <Text style={styles.day}>{formatEventDay(event.at, now)}</Text>
        </View>
      ))}
      {newestFirst.length > SHOWN_AT_FIRST && (
        <TouchableOpacity onPress={() => setShowAll(!showAll)} style={styles.more} accessibilityRole="button">
          <Text style={styles.moreText}>{showAll ? 'Show less' : `Show all ${newestFirst.length}`}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  summary: { fontSize: 13, color: Colors.textSecondary, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  text: { flex: 1, fontSize: 14, color: Colors.text },
  day: { fontSize: 12, color: Colors.textMuted },
  more: { paddingVertical: 6 },
  moreText: { fontSize: 13, color: Colors.primaryLight },
});
