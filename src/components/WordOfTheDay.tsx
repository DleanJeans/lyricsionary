import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useStore } from '../store/useStore';
import { localDay } from '../utils/wordQuiz';
import { highlightWord, lineTranslation, wordOfTheDay } from '../utils/wordOfTheDay';
import { Text } from './Text';

/** One saved word a day in the sidebar, with its meaning and line; tapping opens its song at that line */
export default function WordOfTheDay({ onOpen }: { onOpen: (songId: string, focus: { word: string; line: string; occurrence?: number }) => void }) {
  const words = useStore((s) => s.words);
  const songs = useStore((s) => s.songs);
  const day = localDay(Date.now());
  const pick = useMemo(() => wordOfTheDay(words, day), [words, day]);
  if (!pick) return null;
  const { entry, context, definition } = pick;
  const song = context.songId ? songs.find((s) => s.id === context.songId) : undefined;
  const line = song && context.context?.trim() ? context.context : null;
  const highlight = line ? highlightWord(line, [entry.word, ...(entry.forms ?? [])], context.occurrence) : null;
  // The translation saved with the word, or else the song's translation of the line, if it has one
  const translation = line ? context.translation?.trim() || lineTranslation(song!, line) : null;

  return (
    <TouchableOpacity
      style={styles.card}
      disabled={!line}
      onPress={() => song && line && onOpen(song.id, { word: entry.word, line, occurrence: context.occurrence })}
      accessibilityRole={line ? 'button' : undefined}
      accessibilityLabel={`Word of the day: ${entry.word}, ${definition}`}
    >
      <View style={styles.header}>
        <Ionicons name="sunny-outline" size={14} color={Colors.warning} />
        <Text style={styles.title}>Word of the day</Text>
      </View>
      <Text style={styles.word}>
        {entry.emoji || context.emoji ? `${context.emoji || entry.emoji} ` : ''}
        {entry.word}
      </Text>
      <Text style={styles.definition} numberOfLines={2}>{definition}</Text>
      {line && (
        <>
          <Text style={styles.line} numberOfLines={2}>
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
          {translation ? <Text style={styles.translation} numberOfLines={2}>{translation}</Text> : null}
          <Text style={styles.song} numberOfLines={1}>{song!.songName}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 3,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  title: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  word: { fontSize: 18, fontWeight: '700', color: Colors.text },
  definition: { fontSize: 13, color: Colors.textSecondary },
  line: { fontSize: 13, color: Colors.text, fontStyle: 'italic', marginTop: 4 },
  // Nested Text resets its font size, so each piece of the line repeats it in styles.line
  lineWord: { fontWeight: '700', color: Colors.primaryLight },
  translation: { fontSize: 12, color: Colors.textSecondary },
  song: { fontSize: 11, color: Colors.textMuted },
});
