import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { getMasteryLevelColor } from '../constants/theme';
import { MASTERY_LEVELS, MasteryLevel } from '../types';
import { FilterChip } from './LanguageTabButtons';

interface MasteryLevelTabsProps {
  selectedLevel: MasteryLevel | null;
  onLevelChange: (level: MasteryLevel | null) => void;
  levelCounts: Partial<Record<MasteryLevel, number>>;
}

// Filters saved words by level, one level at a time like the language filters
export default function MasteryLevelTabs({ selectedLevel, onLevelChange, levelCounts }: MasteryLevelTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {MASTERY_LEVELS.filter((level) => (levelCounts[level] ?? 0) > 0).map((level) => (
        <FilterChip
          key={level}
          icon={<View style={[styles.dot, { backgroundColor: getMasteryLevelColor(level) }]} />}
          label={level}
          count={levelCounts[level] ?? 0}
          selected={selectedLevel === level}
          onPress={() => onLevelChange(selectedLevel === level ? null : level)}
          accessibilityLabel={`${level} words filter`}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 60,
  },
  contentContainer: {
    paddingHorizontal: 4,
    paddingBottom: 8,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
