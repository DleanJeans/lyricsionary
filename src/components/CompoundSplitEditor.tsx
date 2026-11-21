import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useStore } from '../store/useStore';
import { buildKnownGermanWords, getCompoundParts, getSplitPositions, splitAtPositions } from '../utils/compoundWords';
import { Text } from './Text';

/** A German word's manual split: its parts, and the state of the editor that sets them */
export function useCompoundSplit(word: string, enabled: boolean) {
  const words = useStore((s) => s.words);
  const compoundSplits = useStore((s) => s.compoundSplits);
  const setCompoundSplit = useStore((s) => s.setCompoundSplit);
  const knownGermanWords = useMemo(() => (enabled ? buildKnownGermanWords(words) : null), [enabled, words]);
  const parts = enabled && knownGermanWords ? getCompoundParts(word, compoundSplits, knownGermanWords) : null;
  const [editing, setEditing] = useState(false);
  // Character positions the word is cut at while editing, e.g. [6] for Liebes|brief
  const [positions, setPositions] = useState<number[]>([]);

  const start = () => {
    setPositions(parts ? getSplitPositions(parts.map((p) => p.text)) : []);
    setEditing(true);
  };
  const toggle = (position: number) =>
    setPositions((ps) => (ps.includes(position) ? ps.filter((p) => p !== position) : [...ps, position]));
  const preview = splitAtPositions(word, positions);
  const save = () => {
    setCompoundSplit(word, preview.length > 1 ? preview : null);
    setEditing(false);
  };
  return { parts, editing, start, cancel: () => setEditing(false), positions, toggle, preview, save };
}

export type CompoundSplit = ReturnType<typeof useCompoundSplit>;

/** The button that opens the split editor, for a card's header tools */
export function SplitButton({ onPress, style }: { onPress: () => void; style?: object }) {
  return (
    <TouchableOpacity accessibilityLabel="Split Compound Word" style={style} onPress={onPress} hitSlop={4}>
      <Ionicons name="cut-outline" size={20} color={Colors.textSecondary} />
    </TouchableOpacity>
  );
}

export default function CompoundSplitEditor({ word, split }: { word: string; split: CompoundSplit }) {
  const letters = Array.from(word);
  return (
    <View style={styles.splitEditor}>
      <Text style={styles.splitHint}>Tap between letters to split the word</Text>
      <View style={styles.letterRow}>
        {letters.map((letter, i) => {
          // Alternate colours so each part of the split stands out
          const partIndex = split.positions.filter((p) => p <= i).length;
          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <TouchableOpacity
                  accessibilityLabel={`Split before letter ${i + 1}`}
                  style={styles.splitGap}
                  hitSlop={{ top: 8, bottom: 8 }}
                  onPress={() => split.toggle(i)}
                >
                  <View style={[styles.splitLine, split.positions.includes(i) && styles.splitLineActive]} />
                </TouchableOpacity>
              )}
              <Text style={[styles.splitLetter, partIndex % 2 === 1 && styles.splitLetterAlt]}>{letter}</Text>
            </React.Fragment>
          );
        })}
      </View>
      <View style={styles.splitActions}>
        <Text style={styles.splitPreview}>{split.preview.length > 1 ? split.preview.join(' + ') : 'Not split'}</Text>
        <TouchableOpacity accessibilityLabel="Cancel Split" style={[styles.chip, styles.chipSecondary]} onPress={split.cancel}>
          <Ionicons name="close" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Save Split" style={styles.chip} onPress={split.save}>
          <Ionicons name="checkmark" size={16} color={Colors.primary} />
          <Text style={styles.chipText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splitEditor: { marginTop: 12, gap: 8 },
  splitHint: { color: Colors.textSecondary, fontSize: 13 },
  letterRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch' },
  splitLetter: { color: Colors.text, fontSize: 24, lineHeight: 32, fontWeight: '600' },
  splitLetterAlt: { color: Colors.primary },
  splitGap: { width: 14, alignItems: 'center', justifyContent: 'center' },
  splitLine: { width: 1, height: 20, backgroundColor: Colors.textMuted, opacity: 0.5 },
  splitLineActive: { width: 3, height: 30, borderRadius: 2, backgroundColor: Colors.primary, opacity: 1 },
  splitActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  splitPreview: { flex: 1, color: Colors.textSecondary, fontSize: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  chipSecondary: { borderColor: Colors.border },
  chipText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
