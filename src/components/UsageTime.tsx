import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useUsageTime } from '../services/usageTime';
import { formatUsage } from '../utils/usageTime';
import { Text } from './Text';

/** Time spent in the app today and over the last 7 days, for the sidebar */
export default function UsageTime() {
  const { today, week } = useUsageTime();
  return (
    <View style={styles.row} accessible accessibilityLabel={`Time in the app: ${formatUsage(today)} today, ${formatUsage(week)} in the last 7 days`}>
      <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
      <Text style={styles.text}>
        <Text style={styles.value}>{formatUsage(today)}</Text> today
      </Text>
      <Text style={styles.text}>
        <Text style={styles.value}>{formatUsage(week)}</Text> in 7 days
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
  },
  text: { fontSize: 13, color: Colors.textSecondary },
  value: { fontSize: 13, fontWeight: '700', color: Colors.text },
});
