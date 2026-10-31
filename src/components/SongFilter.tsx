import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import type { Song } from '../types';
import { FilterChip } from './LanguageTabButtons';
import { Text } from './Text';

interface SongFilterProps {
  /** Songs with saved words, and how many each has */
  songs: { song: Song; count: number }[];
  selectedSongId: string | null;
  onChange: (songId: string | null) => void;
}

/** A chip that picks one song to show the saved words of */
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
      <FilterChip
        icon={<Ionicons name="musical-notes-outline" size={16} color={selected ? Colors.white : Colors.textSecondary} />}
        label={selected ? selected.song.songName : 'Song'}
        count={selected?.count ?? 0}
        selected={!!selected}
        onPress={() => setOpen(true)}
        accessibilityLabel={selected ? `Words from ${selected.song.songName}` : 'Filter by song'}
      />
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
