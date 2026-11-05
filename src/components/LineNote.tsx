import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Colors } from '../constants/theme';
import type { Song } from '../types';
import { useStore } from '../store/useStore';
import { getLineNote, setLineNote } from '../utils/lineNotes';

/** A song line's note on its context card in Look Up: tap it, or "Note on this line", to write it */
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

  return (
    <View style={[styles.row, style]}>
      <Ionicons
        name={note || editing ? 'chatbox-ellipses-outline' : 'add'}
        size={16}
        color={note || editing ? Colors.primaryLight : Colors.textMuted}
      />
      {editing ? (
        <>
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
        </>
      ) : (
        <TouchableOpacity
          style={styles.flex}
          onPress={start}
          accessibilityRole="button"
          accessibilityLabel={note ? 'Edit line note' : 'Note on this line'}
        >
          <Text style={note ? styles.text : styles.add}>{note || 'Note on this line'}</Text>
        </TouchableOpacity>
      )}
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
  flex: { flex: 1 },
  text: { fontSize: 13, color: Colors.text },
  add: { fontSize: 13, color: Colors.textMuted },
  input: { flex: 1, fontSize: 13, color: Colors.text, padding: 0 },
});
