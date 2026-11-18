import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useStore } from '../store/useStore';
import type { Song, WordContext, WordEntry } from '../types';
import { highlightWord, contextTranslation } from '../utils/wordOfTheDay';
import { Text } from './Text';

/**
 * The word's lines in the other songs it was saved from, each opening that song at the line. The
 * lines' translations stay hidden while the word's quiz is waiting for an answer, so they don't give
 * the meaning away. Folded, it starts as one line naming the songs, opened with a tap.
 */
export default function AlsoInSongs({
  item,
  songId,
  hideTranslations = false,
  folded = false,
}: {
  item: WordEntry;
  songId?: string;
  hideTranslations?: boolean;
  folded?: boolean;
}) {
  const navigation = useNavigation<any>();
  const [open, setOpen] = useState(!folded);
  useEffect(() => setOpen(!folded), [item.id, folded]);
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

  if (!open) {
    return (
      <TouchableOpacity
        style={styles.foldedRow}
        onPress={() => setOpen(true)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Show ${item.word} in ${others.length === 1 ? 'one other song' : `${others.length} other songs`}`}
      >
        <Ionicons name="musical-notes-outline" size={14} color={Colors.primaryLight} />
        <Text style={styles.foldedText} numberOfLines={1}>
          Also in <Text style={[styles.foldedText, styles.foldedSongs]}>{others.map((o) => o.songName).join(', ')}</Text>
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Also in</Text>
      <View style={styles.list}>
        {others.map(({ context, song, songName }) => {
          const line = context.context;
          const highlight = highlightWord(line, [item.word, ...(item.forms ?? [])], context.occurrence);
          // The translation saved with the word, or else the song's translation of the line
          const translation = hideTranslations ? null : contextTranslation(song, line, context.translation) ?? null;
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
  foldedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  foldedText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  // Nested Text resets its font size, so it's repeated from foldedText
  foldedSongs: {
    flex: 0,
    color: Colors.text,
    fontWeight: '600',
  },
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
