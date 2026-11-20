import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Colors } from '../constants/theme';
import type { Song } from '../types';
import { useStore } from '../store/useStore';
import { getLineNote, setLineNote } from '../utils/lineNotes';

/** A song line's note on its context card in Look Up: a small "+ Note" pill that opens an input; shows the note as a pill when set */
export default function LineNote({ song, line, style }: { song: Song; line: string; style?: StyleProp<ViewStyle> }) {
  const updateSong = useStore((s) => s.updateSong);
  const note = getLineNote(song.lineNotes, line);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const start = () => {
    setDraft(note ?? '');
    setEditing(true);
  };
  const save = () => {
    setEditing(false);
    if (draft.trim() !== (note ?? '')) void updateSong(song.id, { lineNotes: setLineNote(song.lineNotes, line, draft) });
  };

  if (editing) {
    return (
      <View style={[styles.inputRow, style]}>
        <Ionicons name="chatbox-ellipses-outline" size={14} color={Colors.primaryLight} />
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="What this line means, a pun, the grammar..."
          placeholderTextColor={Colors.textMuted}
          autoFocus
          multiline
          blurOnSubmit
          onSubmitEditing={save}
          onBlur={save}
          accessibilityLabel="Line note"
        />
        <TouchableOpacity onPress={save} hitSlop={8} accessibilityRole="button" accessibilityLabel="Save line note">
          <Ionicons name="checkmark" size={18} color={Colors.primaryLight} />
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={[styles.pillRow, style]}>
      <TouchableOpacity
        style={[styles.pill, !note && styles.pillEmpty]}
        onPress={start}
        accessibilityRole="button"
        accessibilityLabel={note ? 'Edit line note' : 'Add note on this line'}
      >
        {note ? <Ionicons name="chatbox-ellipses-outline" size={12} color={Colors.primaryLight} /> : null}
        <Text style={styles.pillText}>{note || '+ Note'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  pillRow: { flexDirection: 'row' },
  pill: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  pillEmpty: { borderStyle: 'dashed' },
  pillText: { flexShrink: 1, fontSize: 12, color: Colors.textSecondary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: { flex: 1, fontSize: 13, color: Colors.text, padding: 0 },
});
