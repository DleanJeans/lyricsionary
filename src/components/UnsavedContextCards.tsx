import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useStore } from '../store/useStore';
import type { Song, WordContext, WordEntry } from '../types';
import { otherSongLines } from '../utils/reviewQuiz';
import { pickDefinition } from '../utils/definitionHighlight';
import type { WiktionaryDefinition } from '../utils/wiktionary';
import { lineTranslation } from '../utils/wordOfTheDay';
import MarqueeRow from './MarqueeRow';
import SelectableTranslation from './SelectableTranslation';
import ContextLyricLine from './ContextLyricLine';
import { Text } from './Text';

export interface UnsavedLine {
  line: string;
  songId: string;
  songName: string;
  translation?: string;
  definition?: string;
}

/**
 * The word's sentences in other songs of its language that aren't saved as contexts, as see-through
 * dashed cards with a Save this sentence button
 */
export default function UnsavedContextCards({
  word,
  language,
  savedContexts,
  suggestions = [],
  onSave,
}: {
  word: string;
  language: string;
  /** What's saved or being edited as the word's contexts, whose songs and lines are left out */
  savedContexts: Pick<WordContext, 'context' | 'songId' | 'definition' | 'partOfSpeech'>[];
  /** Wiktionary's meanings for the word, to guess which one each translation is using */
  suggestions?: WiktionaryDefinition[];
  onSave: (line: UnsavedLine) => void;
}) {
  const songs = useStore((s) => s.songs);
  const lines = useMemo(
    () => otherSongLines({ word, language, contexts: savedContexts } as unknown as WordEntry, songs),
    [word, language, savedContexts, songs]
  );
  if (!lines.length) return null;
  return (
    <View>
      <Text style={styles.label}>Also in your songs · not saved</Text>
      {lines.map(({ song, line }) => {
        const full = song as Song;
        const translation = (full.originalLyrics && full.translations ? lineTranslation(full, line) : null) ?? undefined;
        const guess = translation
          ? pickDefinition(
              [
                ...savedContexts.filter((c) => c.definition).map((c) => ({ text: c.definition!, partOfSpeech: c.partOfSpeech ?? '' })),
                ...suggestions,
              ] as WiktionaryDefinition[],
              translation
            )
          : null;
        const name = full.songName || 'Untitled';
        return (
          <View key={`${song.id}:${line}`} style={styles.card}>
            <View style={styles.header}>
              <Ionicons name="musical-notes" size={14} color={Colors.primaryLight} />
              <MarqueeRow>
                <Text style={styles.title}>{name}</Text>
                {full.artistName ? <Text style={styles.artist}>· {full.artistName}</Text> : null}
              </MarqueeRow>
              <Text style={styles.tag}>Unsaved</Text>
            </View>
            <View style={styles.body}>
              <ContextLyricLine line={line} word={word} languages={full.originalLanguages} />
              {translation ? (
                // Highlights the meaning that fits, even when it's only a guess; not tappable until saved
                <View pointerEvents="none">
                  <SelectableTranslation translation={translation} onSelect={() => {}} value={guess ?? undefined} style={styles.translation} />
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.save}
              onPress={() => onSave({ line, songId: song.id, songName: name, translation, definition: guess ?? undefined })}
              accessibilityRole="button"
              accessibilityLabel="Save this sentence"
            >
              <Ionicons name="bookmark-outline" size={16} color={Colors.primaryLight} />
              <Text style={styles.saveText}>Save this sentence</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: Colors.textMuted, marginTop: 10, marginBottom: 8, marginLeft: 2 },
  card: {
    backgroundColor: 'rgba(26, 26, 46, 0.35)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#4a4a6a',
    overflow: 'hidden',
    marginBottom: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(37, 37, 61, 0.35)' },
  title: { fontSize: 13, fontWeight: '600', color: Colors.text },
  artist: { fontSize: 13, color: Colors.textSecondary },
  tag: { marginLeft: 'auto', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: Colors.textMuted },
  body: { paddingHorizontal: 12, paddingTop: 10, gap: 4, opacity: 0.85 },
  translation: { fontSize: 14, fontStyle: 'italic', color: Colors.textSecondary },
  save: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    margin: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
  },
  saveText: { fontSize: 14, fontWeight: '600', color: Colors.primaryLight },
});
