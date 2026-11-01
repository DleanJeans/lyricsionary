import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useStore } from '../store/useStore';
import type { Song, WordContext, WordEntry } from '../types';
import { highlightWord, lineTranslation } from '../utils/wordOfTheDay';
import { Text } from './Text';

/**
 * The word's lines in the other songs it was saved from, each opening that song at the line. The
 * lines' translations stay hidden while the word's quiz is waiting for an answer, so they don't give
 * the meaning away.
 */
export default function AlsoInSongs({
  item,
  songId,
  hideTranslations = false,
}: {
  item: WordEntry;
  songId?: string;
  hideTranslations?: boolean;
}) {
  const navigation = useNavigation<any>();
  const songs = useStore((s) => s.songs);
  // One line per song, from songs that are still saved
  const others: { context: WordContext; song: Song; songName: string }[] = [];
  const seen = new Set<string>();
  for (const context of item.contexts ?? []) {
    if (!context.songId || context.songId === songId || seen.has(context.songId) || !context.context?.trim()) continue;
    const song = songs.find((s) => s.id === context.songId);
    if (!song) continue;
    seen.add(context.songId);
    others.push({ context, song, songName: song.songName || context.songName || 'Untitled' });
  }
  if (others.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Also in</Text>
      <View style={styles.list}>
        {others.map(({ context, song, songName }) => {
          const line = context.context;
          const highlight = highlightWord(line, [item.word, ...(item.forms ?? [])], context.occurrence);
          // The translation saved with the word, or else the song's translation of the line
          const translation = hideTranslations ? null : context.translation?.trim() || lineTranslation(song, line);
          return (
            <TouchableOpacity
              key={context.songId}
              style={styles.song}
              onPress={() =>
                navigation.navigate('Learn', {
                  songId: context.songId,
                  focus: { word: item.word, line, occurrence: context.occurrence },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Open ${songName} at ${item.word}`}
            >
              <View style={styles.songHeader}>
                <Ionicons name="musical-notes-outline" size={14} color={Colors.primaryLight} />
                <Text style={styles.songName} numberOfLines={1}>{songName}</Text>
              </View>
              <Text style={styles.line} numberOfLines={3}>
                {highlight ? (
                  <>
                    <Text style={styles.line}>{highlight.before}</Text>
                    <Text style={[styles.line, styles.lineWord]}>{highlight.word}</Text>
                    <Text style={styles.line}>{highlight.after}</Text>
                  </>
                ) : (
                  line
                )}
              </Text>
              {translation ? <Text style={styles.translation} numberOfLines={3}>{translation}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>
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
    alignSelf: 'stretch',
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
  // Nested Text resets its font size, so each piece of the line repeats it in styles.line
  lineWord: {
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  translation: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
