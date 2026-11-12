import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Colors } from '../constants/theme';
import type { WordEntry } from '../types';
import { mergeCandidates } from '../utils/wordForms';
import { shownDefinition } from '../utils/partOfSpeech';

const firstDefinition = (word: WordEntry) => {
  const context = word.contexts.find((c) => c.definition);
  return context?.definition ? shownDefinition(context.definition, context.partOfSpeech) : '';
};

interface MergeFormsProps {
  entry: WordEntry;
  words: WordEntry[];
  /** Merges this word into the picked one (the default), or the picked one into this word when intoPicked is false */
  onMerge: (picked: WordEntry, intoPicked: boolean) => void;
  /** Splits a merged form back out as its own word */
  onUnmerge: (form: string) => void;
}

const MAX_SHOWN = 8;

/**
 * On a saved word's page: its merged forms, and a search for another saved word to merge with. By default this word
 * goes into the picked one (e.g. voulez into veux, from voulez's page); Swap merges the picked one into this word.
 */
export default function MergeForms({ entry, words, onMerge, onUnmerge }: MergeFormsProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<WordEntry | null>(null);
  const [intoPicked, setIntoPicked] = useState(true);
  // Every saved word in the language, sorted, only once the search is open: Look Up draws this each time
  const candidates = useMemo(() => (open ? mergeCandidates(words, entry) : []), [open, words, entry]);
  const lower = query.trim().toLowerCase();
  const shown = candidates.filter((w) => !lower || w.word.toLowerCase().includes(lower)).slice(0, MAX_SHOWN);

  const close = () => {
    setOpen(false);
    setQuery('');
    setPicked(null);
    setIntoPicked(true);
  };

  return (
    <View style={styles.container}>
      {(entry.forms?.length ?? 0) > 0 && (
        <View style={styles.forms}>
          {entry.forms!.map((form) => (
            <View key={form} style={styles.formChip}>
              <Text style={styles.formText}>{form}</Text>
              <TouchableOpacity
                onPress={() => onUnmerge(form)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Unmerge ${form}`}
              >
                <Ionicons name="close" size={14} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      {picked ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>
            Merge “{(intoPicked ? entry : picked).word}” into “{(intoPicked ? picked : entry).word}”?{' '}
            {intoPicked
              ? `“${entry.word}” becomes a form of “${picked.word}”, and its ${entry.contexts.length === 1 ? 'context' : 'contexts'} and quiz answers move there.`
              : `Its ${picked.contexts.length === 1 ? 'context' : 'contexts'} and quiz answers move here, and it stops being a word of its own.`}
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity
              onPress={() => setIntoPicked((v) => !v)}
              style={styles.swapButton}
              accessibilityRole="button"
              accessibilityLabel="Swap merge direction"
            >
              <Ionicons name="swap-horizontal" size={16} color={Colors.primaryLight} />
              <Text style={styles.swapText}>Swap</Text>
            </TouchableOpacity>
            <View style={styles.spacer} />
            <TouchableOpacity onPress={() => { setPicked(null); setIntoPicked(true); }} style={styles.cancelButton} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onMerge(picked, intoPicked);
                close();
              }}
              style={styles.mergeButton}
              accessibilityRole="button"
              accessibilityLabel="Confirm merge"
            >
              <Text style={styles.mergeText}>Merge</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : open ? (
        <View style={styles.picker}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder="Find a word to merge with..."
              placeholderTextColor={Colors.textMuted}
              autoFocus
              autoCapitalize="none"
              accessibilityLabel="Find a word to merge with"
            />
            <TouchableOpacity onPress={close} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close merge">
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {shown.length === 0 ? (
            <Text style={styles.empty}>No other {entry.language} words saved</Text>
          ) : (
            shown.map((w) => (
              <TouchableOpacity key={w.id} onPress={() => setPicked(w)}
                style={styles.candidate}
                accessibilityRole="button"
                accessibilityLabel={`Merge ${w.word}`}
              >
                <Text style={styles.candidateWord}>{w.word}</Text>
                <Text style={styles.candidateMeta} numberOfLines={1}>
                  {firstDefinition(w)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : (
        <TouchableOpacity onPress={() => setOpen(true)} style={styles.openButton} accessibilityRole="button">
          <Ionicons name="git-merge-outline" size={16} color={Colors.primaryLight} />
          <Text style={styles.openText}>Merge with another saved word</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  forms: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  formChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  formText: { fontSize: 14, color: Colors.text },
  openButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, alignSelf: 'flex-start' },
  openText: { fontSize: 14, color: Colors.primaryLight },
  picker: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 8,
    gap: 2,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6 },
  search: { flex: 1, fontSize: 15, color: Colors.text, paddingVertical: 8 },
  empty: { fontSize: 14, color: Colors.textMuted, padding: 8 },
  candidate: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingVertical: 10, paddingHorizontal: 6 },
  candidateWord: { fontSize: 15, color: Colors.text },
  candidateMeta: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  confirm: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 12,
  },
  confirmText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  confirmButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spacer: { flex: 1 },
  swapButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 8 },
  swapText: { fontSize: 14, color: Colors.primaryLight },
  cancelButton: { paddingHorizontal: 14, paddingVertical: 8 },
  cancelText: { fontSize: 14, color: Colors.textSecondary },
  mergeButton: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  mergeText: { fontSize: 14, color: Colors.white, fontWeight: '600' },
});
