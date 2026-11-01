import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useStore } from '../store/useStore';
import { allowReviewReminders } from '../services/reviewReminder';
import { answersToday, DAILY_GOALS, dayStreak, nextDailyGoal, weekDays, weekTotals } from '../utils/activity';
import { usePersistedState } from '../hooks/usePersistedState';
import { REMINDER_HOUR, STREAK_SAVER_HOUR } from '../utils/reviewReminder';
import { Text } from './Text';

function Stat({ icon, color, value, label }: { icon: keyof typeof Ionicons.glyphMap; color: string; value: number; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <View style={styles.statRow}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={styles.value}>{value}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const isGoal = (value: unknown): value is number => typeof value === 'number' && DAILY_GOALS.includes(value);

/** Today's quiz answers toward a goal of a few a day; tapping the goal changes it */
function DailyGoal({ answers }: { answers: number }) {
  const [goal, setGoal] = usePersistedState('@lyricsionary_daily_goal', 0, isGoal);
  const done = goal > 0 && answers >= goal;
  return (
    <TouchableOpacity
      style={styles.goal}
      onPress={() => setGoal(nextDailyGoal(goal))}
      accessibilityRole="button"
      accessibilityLabel={goal ? `Daily goal: ${answers} of ${goal} answers. Tap to change it` : 'Set a daily goal'}
    >
      <View style={styles.goalRow}>
        <Ionicons name={done ? 'checkmark-circle' : 'flag-outline'} size={16} color={done ? Colors.success : Colors.textSecondary} />
        <Text style={styles.goalText}>
          {goal ? `${Math.min(answers, goal)} of ${goal} answers today` : 'Set a daily goal'}
        </Text>
        <Text style={styles.goalChange}>{goal ? 'Change' : 'Off'}</Text>
      </View>
      {goal > 0 && (
        <View style={styles.goalTrack}>
          <View style={[styles.goalFill, { width: `${Math.min(100, (answers / goal) * 100)}%` }, done && styles.goalFillDone]} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const CHART_HEIGHT = 36;

/** Quiz answers on each of the last 7 days, as bars, today last */
function WeekChart({ days }: { days: { day: string; label: string; answers: number }[] }) {
  const most = Math.max(...days.map((d) => d.answers), 1);
  return (
    <View style={styles.chart} accessible accessibilityLabel={`Answers in the last 7 days: ${days.map((d) => d.answers).join(', ')}`}>
      {days.map((d, i) => (
        <View key={d.day} style={styles.chartColumn}>
          <View style={styles.chartBarArea}>
            <View
              style={[
                styles.chartBar,
                { height: d.answers ? Math.max(3, (d.answers / most) * CHART_HEIGHT) : 2 },
                !d.answers && styles.chartBarEmpty,
                i === days.length - 1 && styles.chartBarToday,
              ]}
            />
          </View>
          <Text style={styles.chartLabel}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** The day streak and this week's saved words and level ups, from the activity log */
export default function ProgressStats() {
  const activity = useStore((s) => s.activity);
  const reviewReminder = useStore((s) => s.reviewReminder);
  const setReviewReminder = useStore((s) => s.setReviewReminder);
  const toggleReminder = async (on: boolean) => {
    // Turned on only once notifications are allowed
    if (on && !(await allowReviewReminders())) return;
    await setReviewReminder(on);
  };
  const clock = (hour: number) => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
  const reminderTime = clock(REMINDER_HOUR);
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
      <DailyGoal answers={answersToday(activity, now)} />
      {week.answers > 0 && <WeekChart days={weekDays(activity, now)} />}
      {week.answers > 0 && (
        <Text style={styles.caption}>
          {week.answers} quiz {week.answers === 1 ? 'answer' : 'answers'} in the last 7 days
        </Text>
      )}
      {Platform.OS !== 'web' && (
        <View style={styles.reminderRow}>
          <Ionicons name="notifications-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.reminderText}>Remind me at {reminderTime} when words are due, and at {clock(STREAK_SAVER_HOUR)} before a streak breaks</Text>
          <Switch
            value={reviewReminder}
            onValueChange={(on) => void toggleReminder(on)}
            trackColor={{ true: Colors.primary, false: Colors.border }}
            thumbColor={Colors.white}
            accessibilityLabel="Daily review reminder"
          />
        </View>
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
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  goal: {
    gap: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  goalChange: {
    fontSize: 12,
    color: Colors.primaryLight,
  },
  goalTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  goalFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  goalFillDone: {
    backgroundColor: Colors.success,
  },
  chart: {
    flexDirection: 'row',
    gap: 6,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  chartBarArea: {
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
  },
  chartBar: {
    borderRadius: 3,
    backgroundColor: Colors.primaryLight,
  },
  chartBarEmpty: {
    backgroundColor: Colors.border,
  },
  chartBarToday: {
    backgroundColor: Colors.primary,
  },
  chartLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  caption: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
