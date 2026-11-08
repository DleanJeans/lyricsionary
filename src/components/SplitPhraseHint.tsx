import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Colors } from '../constants/theme';

/**
 * Above a word card, to make a phrase of words that sit apart in the line: a German verb's particle at
 * the end of its clause to select with it (hört … auf), or the words of a phrase dragged across to
 * leave out (all dieser Schmerz in hört all dieser Schmerz auf)
 */
export default function SplitPhraseHint({
  suggestion,
  trim,
}: {
  suggestion?: { phrase: string; onSelect: () => void };
  trim?: { words: string[]; dropped: number[]; onToggle: (index: number) => void };
}) {
  if (suggestion) {
    return (
      <TouchableOpacity
        onPress={suggestion.onSelect}
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={`Select ${suggestion.phrase}`}
      >
        <Ionicons name="link-outline" size={16} color={Colors.primaryLight} />
        <Text style={styles.text} numberOfLines={1}>
          Part of <Text style={[styles.text, styles.bold]}>{suggestion.phrase}</Text>?
        </Text>
        <View style={styles.select}>
          <Text style={styles.selectText}>Select</Text>
        </View>
      </TouchableOpacity>
    );
  }
  if (!trim) return null;
  return (
    <View style={[styles.row, styles.trim]}>
      <Text style={styles.hint}>Tap words to leave them out</Text>
      <View style={styles.words}>
        {trim.words.map((word, i) => {
          const dropped = trim.dropped.includes(i);
          return (
            <TouchableOpacity
              key={i}
              onPress={() => trim.onToggle(i)}
              style={[styles.word, dropped && styles.wordDropped]}
              accessibilityRole="button"
              accessibilityState={{ selected: !dropped }}
              accessibilityLabel={dropped ? `Put ${word} back` : `Leave out ${word}`}
            >
              <Text style={[styles.wordText, dropped && styles.wordTextDropped]}>{word}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  select: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  selectText: { fontSize: 13, color: Colors.white, fontWeight: '600' },
  trim: { flexDirection: 'column', alignItems: 'flex-start', gap: 6 },
  hint: { fontSize: 12, color: Colors.textSecondary },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  word: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  wordDropped: { backgroundColor: 'transparent', borderColor: Colors.border, borderStyle: 'dashed' },
  wordText: { fontSize: 15, color: Colors.text },
  wordTextDropped: { color: Colors.textMuted, textDecorationLine: 'line-through' },
});
