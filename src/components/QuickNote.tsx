import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Colors } from '../constants/theme';
import type { WordEntry } from '../types';
import { useStore } from '../store/useStore';

/** A saved word's note on its card: tap it, or "Add a note", to write it there without opening the word's page */
export default function QuickNote({ entry }: { entry: WordEntry }) {
  const updateWordEntry = useStore((s) => s.updateWordEntry);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const start = () => {
    setDraft(entry.note ?? '');
    setEditing(true);
  };
  const save = () => {
    setEditing(false);
    const note = draft.trim();
    if (note !== (entry.note ?? '')) void updateWordEntry(entry.id, { note: note || undefined });
  };

  if (editing) {
    return (
      <View style={styles.row}>
        <Ionicons name="document-text-outline" size={14} color={Colors.textSecondary} style={styles.icon} />
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="A mnemonic, a grammar tip..."
          placeholderTextColor={Colors.textMuted}
          autoFocus
          multiline
          blurOnSubmit
          onSubmitEditing={save}
          onBlur={save}
          accessibilityLabel="Note"
        />
        <TouchableOpacity onPress={save} hitSlop={8} accessibilityRole="button" accessibilityLabel="Save note">
          <Ionicons name="checkmark" size={18} color={Colors.primaryLight} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={start}
      accessibilityRole="button"
      accessibilityLabel={entry.note ? 'Edit note' : 'Add a note'}
    >
      <Ionicons
        name={entry.note ? 'document-text-outline' : 'add'}
        size={14}
        color={entry.note ? Colors.textSecondary : Colors.textMuted}
        style={styles.icon}
      />
      <Text style={entry.note ? styles.text : styles.add}>{entry.note || 'Add a note'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
  },
  icon: { marginTop: 2 },
  text: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  add: { fontSize: 12, color: Colors.textMuted },
  input: { flex: 1, fontSize: 13, color: Colors.text, padding: 0 },
});
