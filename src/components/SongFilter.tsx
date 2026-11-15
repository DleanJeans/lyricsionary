import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import type { Song } from '../types';
import { Text } from './Text';

interface SongFilterProps {
  /** Songs with saved words, and how many each has */
  songs: { song: Song; count: number }[];
  selectedSongId: string | null;
  onChange: (songId: string | null) => void;
}

/** A dropdown button that picks one song to show the saved words of */
export default function SongFilter({ songs, selectedSongId, onChange }: SongFilterProps) {
  const [open, setOpen] = useState(false);
  const selected = songs.find((s) => s.song.id === selectedSongId);
  if (songs.length === 0 && !selected) return null;
  const choose = (songId: string | null) => {
    setOpen(false);
    onChange(songId);
  };
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.button, !!selected && styles.buttonSelected, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={selected ? `Words from ${selected.song.songName}` : 'Filter by song'}
        accessibilityState={{ selected: !!selected }}
      >
        <Ionicons name="musical-notes-outline" size={15} color={selected ? Colors.white : Colors.textSecondary} />
        <Text style={[styles.buttonLabel, !!selected && styles.buttonLabelSelected]} numberOfLines={1}>
          {selected ? selected.song.songName : 'All songs'}
        </Text>
        <Ionicons name="chevron-down" size={13} color={selected ? Colors.white : Colors.textMuted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.title}>Words from a song</Text>
            <ScrollView contentContainerStyle={styles.list}>
              <TouchableOpacity style={styles.row} onPress={() => choose(null)} accessibilityRole="button" accessibilityLabel="All songs">
                <Text style={[styles.name, !selected && styles.selected]}>All songs</Text>
              </TouchableOpacity>
              {songs.map(({ song, count }) => (
                <TouchableOpacity
                  key={song.id}
                  style={styles.row}
                  onPress={() => choose(song.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${song.songName}, ${count} words`}
                >
                  <View style={styles.rowText}>
                    <Text style={[styles.name, song.id === selectedSongId && styles.selected]} numberOfLines={1}>
                      {song.songName}
                    </Text>
                    {!!song.artistName && <Text style={styles.artist} numberOfLines={1}>{song.artistName}</Text>}
                  </View>
                  <Text style={styles.count}>{count}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexShrink: 1,
    minWidth: 0,
  },
  buttonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  buttonLabel: {
    fontSize: 13,
    color: Colors.text,
    flexShrink: 1,
  },
  buttonLabelSelected: {
    color: Colors.white,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '75%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    color: Colors.text,
  },
  selected: {
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  artist: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  count: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
