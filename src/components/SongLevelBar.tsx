import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { MASTERY_LEVELS, MasteryLevel } from '../types';
import { Text } from './Text';

/** The song's saved words by level, as a bar, and how many are Recalled or Known */
export default function SongLevelBar({ counts }: { counts: Partial<Record<MasteryLevel, number>> }) {
  const total = MASTERY_LEVELS.reduce((sum, level) => sum + (counts[level] ?? 0), 0);
  if (total === 0) return null;
  const mastered = (counts.Recalled ?? 0) + (counts.Known ?? 0);
  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`${mastered} of ${total} saved words Recalled or Known`}
    >
      <View style={styles.bar}>
        {MASTERY_LEVELS.map((level) =>
          counts[level] ? (
            <View key={level} style={{ flex: counts[level], backgroundColor: getMasteryLevelColor(level) }} />
          ) : null
        )}
      </View>
      <Text style={styles.label}>
        {mastered}/{total} recalled
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  bar: {
    flex: 1,
    maxWidth: 160,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    flexDirection: 'row',
    gap: 1,
    backgroundColor: Colors.border,
  },
  label: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
