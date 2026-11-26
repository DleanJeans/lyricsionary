import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';
import { getFlagForLanguage } from '../constants/languages';
import { useLanguageUsage, useUsageTime } from '../services/usageTime';
import { formatUsage } from '../utils/usageTime';
import { Text } from './Text';

/** Time spent in the app today and over the last 7 days, for the sidebar */
export default function UsageTime() {
  const { today, week } = useUsageTime();
  const languages = useLanguageUsage();
  return (
    <View style={styles.card}>
    <View style={styles.row} accessible accessibilityLabel={`Time in the app: ${formatUsage(today)} today, ${formatUsage(week)} in the last 7 days`}>
      <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
      <Text style={styles.text}>
        <Text style={styles.value}>{formatUsage(today)}</Text> today
      </Text>
      <Text style={styles.text}>
        <Text style={styles.value}>{formatUsage(week)}</Text> in 7 days
      </Text>
    </View>
      {languages.length > 0 && (
        <View style={styles.languages}>
          {languages.slice(0, 5).map((l) => (
            <View key={l.language} style={styles.languageRow} accessible accessibilityLabel={`${l.language}: ${formatUsage(l.today)} today, ${formatUsage(l.week)} in 7 days`}>
              <Text style={styles.flag}>{getFlagForLanguage(l.language)}</Text>
              <Text style={[styles.text, styles.languageName]} numberOfLines={1}>{l.language}</Text>
              <Text style={styles.text}><Text style={styles.value}>{formatUsage(l.today)}</Text> today</Text>
              <Text style={styles.text}><Text style={styles.value}>{formatUsage(l.week)}</Text> in 7d</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, backgroundColor: Colors.surfaceLight },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  languages: { paddingHorizontal: 10, paddingBottom: 10, gap: 6 },
  languageRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flag: { fontSize: 14 },
  languageName: { flex: 1 },
  text: { fontSize: 13, color: Colors.textSecondary },
  value: { fontSize: 13, fontWeight: '700', color: Colors.text },
});
