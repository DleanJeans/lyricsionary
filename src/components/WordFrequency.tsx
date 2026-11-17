import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { openWordLookup } from '../navigation/navigationRef';
import { useStore } from '../store/useStore';
import type { WordEntry } from '../types';
import { findSavedWord } from '../utils/wordForms';
import { wordSentences } from '../utils/reviewQuiz';
import ContextLyricLine from './ContextLyricLine';
import { Text } from './Text';

type Entry = Pick<WordEntry, 'word' | 'language' | 'contexts'>;

/**
 * How many songs and distinct sentences the word or phrase is in (a repeated sentence, like a chorus,
 * counts once). Tapping it lists them with their translations, in Learn's colors, each word opening its page.
 */
export default function WordFrequency({ entry, onLookUpWord }: { entry: Entry; onLookUpWord?: () => void }) {
  const songs = useStore((s) => s.songs);
  const [open, setOpen] = useState(false);
  const sentences = useMemo(() => wordSentences(entry, songs), [entry, songs]);
  const songCount = new Set(sentences.flatMap((x) => x.songs.map((y) => y.id).filter(Boolean))).size;
  if (!sentences.length) return null;
  const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
  const label = `In ${plural(songCount, 'song')} · ${plural(sentences.length, 'sentence')}`;

  return (
    <>
      <TouchableOpacity style={styles.row} onPress={() => setOpen(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${label}, show them`}>
        <Ionicons name="stats-chart-outline" size={14} color={Colors.primary} />
        <Text style={styles.text}>{label}</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle} numberOfLines={1}>{entry.word} · {label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.list}>
              {sentences.map((sentence) => {
                const main = sentence.songs[0];
                const translation = sentence.songs.find((x) => x.translation)?.translation;
                return (
                  <View key={sentence.line} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Ionicons name="musical-notes" size={14} color={Colors.primaryLight} />
                      <Text style={styles.songName} numberOfLines={1}>{main.name}</Text>
                      {main.artist ? <Text style={styles.artist} numberOfLines={1}>· {main.artist}</Text> : null}
                      {sentence.songs.length > 1 ? <Text style={styles.more}>+{sentence.songs.length - 1} more</Text> : null}
                    </View>
                    <View style={styles.body}>
                      <ContextLyricLine
                        line={sentence.line}
                        word={entry.word}
                        languages={main.song?.originalLanguages ?? [entry.language]}
                        onWordPress={(tapped, occurrence) => {
                          const saved = findSavedWord(useStore.getState().words, tapped, entry.language);
                          setOpen(false);
                          onLookUpWord?.();
                          openWordLookup({
                            word: tapped,
                            wordId: saved?.id,
                            songId: main.id || undefined,
                            songName: main.name,
                            artistName: main.artist,
                            lyricsLine: sentence.line,
                            translationLine: translation,
                            originalLanguages: main.song?.originalLanguages ?? [entry.language],
                            source: 'Words',
                            occurrence,
                          });
                        }}
                      />
                      {translation ? <Text style={styles.translation}>{translation}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  text: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '85%', backgroundColor: Colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  sheetTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.text },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.surfaceLight },
  songName: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: Colors.text },
  artist: { flexShrink: 1, fontSize: 13, color: Colors.textSecondary },
  more: { marginLeft: 'auto', fontSize: 12, color: Colors.textMuted },
  body: { padding: 12, gap: 6 },
  translation: { fontSize: 14, fontStyle: 'italic', color: Colors.textSecondary },
});
