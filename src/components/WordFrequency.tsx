import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useStore } from '../store/useStore';
import type { WordEntry } from '../types';
import { wordFrequency } from '../utils/reviewQuiz';
import { Text } from './Text';

/** How many songs and distinct sentences the word or phrase is in; a repeated sentence (chorus) counts once */
export default function WordFrequency({ entry }: { entry: Pick<WordEntry, 'word' | 'language' | 'contexts'> }) {
  const songs = useStore((s) => s.songs);
  const { lines, songs: inSongs } = useMemo(() => wordFrequency(entry as WordEntry, songs), [entry, songs]);
  if (!lines && !inSongs) return null;
  const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
  return (
    <View style={styles.row} accessibilityLabel={`In ${plural(inSongs, 'song')} and ${plural(lines, 'sentence')}`}>
      <Ionicons name="stats-chart-outline" size={14} color={Colors.textSecondary} />
      <Text style={styles.text}>
        In {plural(inSongs, 'song')} · {plural(lines, 'sentence')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  text: { fontSize: 13, color: Colors.textSecondary },
});
