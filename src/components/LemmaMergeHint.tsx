import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Colors } from '../constants/theme';
import type { WordEntry } from '../types';
import { useStore } from '../store/useStore';
import { getWiktionaryLemmas } from '../utils/wiktionary';
import { findSavedWord } from '../utils/wordForms';

// Hints dismissed this session, by word id
const dismissed = new Set<string>();

/** Above a saved word's card: when Wiktionary says it's a form of another saved word, e.g. veux of vouloir, offers to merge it in */
export default function LemmaMergeHint({ entry }: { entry: WordEntry }) {
  const words = useStore((s) => s.words);
  const mergeWords = useStore((s) => s.mergeWords);
  const [lemmas, setLemmas] = useState<string[]>([]);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setLemmas([]);
    setHidden(dismissed.has(entry.id));
    let current = true;
    void getWiktionaryLemmas(entry.word, entry.language).then((found) => current && setLemmas(found));
    return () => {
      current = false;
    };
  }, [entry.id, entry.word, entry.language]);

  const target = lemmas.map((lemma) => findSavedWord(words, lemma, entry.language)).find((w) => w && w.id !== entry.id);
  if (!target || hidden) return null;

  return (
    <View style={styles.row}>
      <Ionicons name="git-merge-outline" size={16} color={Colors.primaryLight} />
      <Text style={styles.text} numberOfLines={2}>
        A form of <Text style={[styles.text, styles.bold]}>{target.word}</Text>, which you saved
      </Text>
      <TouchableOpacity
        onPress={() => void mergeWords(target.id, entry.id)}
        style={styles.merge}
        accessibilityRole="button"
        accessibilityLabel={`Merge into ${target.word}`}
      >
        <Text style={styles.mergeText}>Merge</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          dismissed.add(entry.id);
          setHidden(true);
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Dismiss merge hint"
      >
        <Ionicons name="close" size={16} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  bold: { flex: 0, color: Colors.text, fontWeight: '600' },
  merge: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  mergeText: { fontSize: 13, color: Colors.white, fontWeight: '600' },
});
