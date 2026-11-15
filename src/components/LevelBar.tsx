import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { MASTERY_LEVELS, MasteryLevel } from '../types';
import { Text } from './Text';

interface LevelBarProps {
  levelCounts: Partial<Record<MasteryLevel, number>>;
  selectedLevel: MasteryLevel | null;
  onLevelChange: (level: MasteryLevel | null) => void;
}

/**
 * How the saved words split across the levels, as one bar with a label per level. Tapping a level's
 * label or its part of the bar shows only its words; tapping it again shows them all.
 */
export default function LevelBar({ levelCounts, selectedLevel, onLevelChange }: LevelBarProps) {
  const levels = MASTERY_LEVELS.filter((level) => (levelCounts[level] ?? 0) > 0 || level === selectedLevel);
  if (levels.length === 0) return null;
  const toggle = (level: MasteryLevel) => onLevelChange(selectedLevel === level ? null : level);
  const faded = (level: MasteryLevel) => selectedLevel !== null && selectedLevel !== level;
  return (
    <View style={styles.container}>
      <View style={styles.track}>
        {levels.map((level) => (
          <Pressable
            key={level}
            onPress={() => toggle(level)}
            // Each level's part stays tappable even when it's a sliver
            hitSlop={{ top: 10, bottom: 6 }}
            style={[
              styles.segment,
              { flex: Math.max(levelCounts[level] ?? 0, 1), backgroundColor: getMasteryLevelColor(level) },
              faded(level) && styles.faded,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${level} words filter`}
            accessibilityState={{ selected: selectedLevel === level }}
          />
        ))}
      </View>
      <View style={styles.labels}>
        {levels.map((level) => {
          const selected = selectedLevel === level;
          return (
            <Pressable
              key={level}
              onPress={() => toggle(level)}
              hitSlop={6}
              style={[styles.label, selected && styles.labelSelected]}
              accessibilityRole="button"
              accessibilityLabel={`${level}, ${levelCounts[level] ?? 0} words`}
              accessibilityState={{ selected }}
            >
              <View style={[styles.dot, { backgroundColor: getMasteryLevelColor(level) }, faded(level) && styles.faded]} />
              <Text style={[styles.name, faded(level) && styles.nameFaded]} numberOfLines={1}>
                {level} <Text style={[styles.count, faded(level) && styles.nameFaded]}>{levelCounts[level] ?? 0}</Text>
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 4,
    marginBottom: 10,
  },
  track: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
  },
  segment: {
    height: '100%',
  },
  faded: {
    opacity: 0.3,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 1,
  },
  labelSelected: {
    backgroundColor: 'rgba(108,92,231,0.3)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  nameFaded: {
    color: Colors.textMuted,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
});
