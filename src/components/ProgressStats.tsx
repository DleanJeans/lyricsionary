import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useStore } from '../store/useStore';
import { dayStreak, weekTotals } from '../utils/activity';
import { Text } from './Text';

function Stat({ icon, color, value, label }: { icon: keyof typeof Ionicons.glyphMap; color: string; value: number; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

/** The day streak and this week's saved words and level ups, from the activity log */
export default function ProgressStats() {
  const activity = useStore((s) => s.activity);
  const now = Date.now();
  const streak = dayStreak(activity, now);
  const week = weekTotals(activity, now);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your progress</Text>
      <View style={styles.stats}>
        <Stat icon="flame" color={Colors.warning} value={streak} label="day streak" />
        <Stat icon="bookmark" color={Colors.primaryLight} value={week.saved} label="words saved this week" />
        <Stat icon="trending-up" color={Colors.success} value={week.levelUps} label="level ups this week" />
      </View>
      {week.answers > 0 && (
        <Text style={styles.caption}>
          {week.answers} quiz {week.answers === 1 ? 'answer' : 'answers'} in the last 7 days
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  label: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
