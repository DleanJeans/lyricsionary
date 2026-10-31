import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useStore } from '../store/useStore';
import type { WordContext, WordEntry } from '../types';
import { Text } from './Text';

/** The word's lines in the other songs it was saved from, each opening that song at the line */
export default function AlsoInSongs({ item, songId }: { item: WordEntry; songId?: string }) {
  const navigation = useNavigation<any>();
  const songs = useStore((s) => s.songs);
  // One line per song, from songs that are still saved
  const others: { context: WordContext; songName: string }[] = [];
  const seen = new Set<string>();
  for (const context of item.contexts ?? []) {
    if (!context.songId || context.songId === songId || seen.has(context.songId) || !context.context?.trim()) continue;
    const song = songs.find((s) => s.id === context.songId);
    if (!song) continue;
    seen.add(context.songId);
    others.push({ context, songName: song.songName || context.songName || 'Untitled' });
  }
  if (others.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Also in</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {others.map(({ context, songName }) => (
          <TouchableOpacity
            key={context.songId}
            style={styles.song}
            onPress={() =>
              navigation.navigate('Learn', {
                songId: context.songId,
                focus: { word: item.word, line: context.context, occurrence: context.occurrence },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`Open ${songName} at ${item.word}`}
          >
            <View style={styles.songHeader}>
              <Ionicons name="musical-notes-outline" size={14} color={Colors.primaryLight} />
              <Text style={styles.songName} numberOfLines={1}>{songName}</Text>
            </View>
            <Text style={styles.line} numberOfLines={2}>{context.context}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    gap: 8,
  },
  song: {
    width: 200,
    gap: 2,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  songHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  songName: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  line: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
