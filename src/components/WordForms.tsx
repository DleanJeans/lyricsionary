import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Colors } from '../constants/theme';
import type { WordEntry } from '../types';
import { baseOf, linkedForms, mergeCandidates } from '../utils/wordForms';
import { shownDefinition } from '../utils/partOfSpeech';

const firstDefinition = (word: WordEntry) => {
  const context = word.contexts.find((c) => c.definition);
  return context?.definition ? shownDefinition(context.definition, context.partOfSpeech) : '';
};

interface WordFormsProps {
  entry: WordEntry;
  words: WordEntry[];
  /** Links words as forms of a base, or unlinks them when baseId is undefined */
  onLink: (ids: string[], baseId: string | undefined) => void;
  /** Splits a form merged in earlier out as its own word, linked to this one */
  onSplit: (form: string) => void;
  /** Opens another saved word's page */
  onOpen: (word: WordEntry) => void;
}

const MAX_SHOWN = 8;

type Mode = 'base' | 'forms' | null;

/**
 * On a saved word's page: the word it is a form of, the saved words that are its forms, and a search to pick either.
 * Each form stays a saved word of its own, with its own IPA, audio, level and contexts.
 */
export default function WordForms({ entry, words, onLink, onSplit, onOpen }: WordFormsProps) {
  const [mode, setMode] = useState<Mode>(null);
  const [query, setQuery] = useState('');
  const base = baseOf(words, entry);
  const forms = linkedForms(words, entry);
  const merged = entry.forms ?? [];
  // A word is either a base with forms or a form of a base, not both
  const hasForms = forms.length > 0 || merged.length > 0;
  const candidates = useMemo(() => (mode ? mergeCandidates(words, entry) : []), [mode, words, entry]);
  const lower = query.trim().toLowerCase();
  const shown = candidates
    // A base can't be a form, and a form can't have forms
    .filter((w) =>
      mode === 'base'
        ? !w.baseId && w.baseId !== entry.id
        : w.baseId === entry.id || (!w.baseId && !words.some((o) => o.baseId === w.id) && !w.forms?.length)
    )
    .filter((w) => !lower || w.word.toLowerCase().includes(lower))
    .slice(0, MAX_SHOWN);

  const close = () => {
    setMode(null);
    setQuery('');
  };

  const open = (next: Exclude<Mode, null>, label: string, icon: keyof typeof Ionicons.glyphMap) => (
    <TouchableOpacity onPress={() => setMode(next)} style={styles.openButton} accessibilityRole="button">
      <Ionicons name={icon} size={16} color={Colors.primaryLight} />
      <Text style={styles.openText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {base && (
        <View style={styles.chips}>
          <View style={styles.baseChip}>
            <Ionicons name="arrow-up-outline" size={14} color={Colors.primaryLight} />
            <Text style={styles.formText}>Form of</Text>
            <TouchableOpacity onPress={() => onOpen(base)} accessibilityRole="button" accessibilityLabel={`Open ${base.word}`}>
              <Text style={[styles.formText, styles.link]}>{base.word}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onLink([entry.id], undefined)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${base.word} as base form`}
            >
              <Ionicons name="close" size={14} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      {(forms.length > 0 || merged.length > 0) && (
        <View style={styles.chips}>
          {forms.map((form) => (
            <View key={form.id} style={styles.formChip}>
              <TouchableOpacity onPress={() => onOpen(form)} accessibilityRole="button" accessibilityLabel={`Open ${form.word}`}>
                <Text style={styles.formText}>{form.word}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onLink([form.id], undefined)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Unlink ${form.word}`}
              >
                <Ionicons name="close" size={14} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
          {merged.map((form) => (
            <View key={`merged-${form}`} style={styles.formChip}>
              <Text style={styles.formText}>{form}</Text>
              <TouchableOpacity
                onPress={() => onSplit(form)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Split ${form} out as its own word`}
              >
                <Ionicons name="close" size={14} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      {mode ? (
        <View style={styles.picker}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder={mode === 'base' ? 'Find this word’s base form...' : 'Find a word to add as a form...'}
              placeholderTextColor={Colors.textMuted}
              autoFocus
              autoCapitalize="none"
              accessibilityLabel={mode === 'base' ? 'Find base form' : 'Find form to add'}
            />
            <TouchableOpacity onPress={close} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {shown.length === 0 ? (
            <Text style={styles.empty}>No other {entry.language} words saved</Text>
          ) : (
            shown.map((w) => {
              const added = mode === 'forms' && w.baseId === entry.id;
              return (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => {
                    if (mode === 'base') {
                      onLink([entry.id], w.id);
                      close();
                    } else {
                      onLink([w.id], added ? undefined : entry.id);
                    }
                  }}
                  style={styles.candidate}
                  accessibilityRole="button"
                  accessibilityLabel={mode === 'base' ? `Set ${w.word} as base form` : `${added ? 'Remove' : 'Add'} ${w.word} as a form`}
                >
                  <Text style={styles.candidateWord}>{w.word}</Text>
                  <Text style={styles.candidateMeta} numberOfLines={1}>
                    {firstDefinition(w)}
                  </Text>
                  {mode === 'forms' && (
                    <Ionicons
                      name={added ? 'checkmark-circle' : 'add-circle-outline'}
                      size={20}
                      color={added ? Colors.primaryLight : Colors.textSecondary}
                    />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      ) : (
        <View style={styles.actions}>
          {!base && !hasForms && open('base', 'Set base form', 'arrow-up-outline')}
          {!base && open('forms', 'Add forms', 'add-circle-outline')}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  baseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
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
  link: { color: Colors.primaryLight, fontWeight: '600' },
  openButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
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
  candidate: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 6 },
  candidateWord: { fontSize: 15, color: Colors.text },
  candidateMeta: { flex: 1, fontSize: 13, color: Colors.textSecondary },
});
