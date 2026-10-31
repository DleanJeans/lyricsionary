import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import {
  canReadPrivatePlaylists,
  getSpotifyPlaylists,
  getSpotifyPlaylistTracks,
  spotifyErrorMessage,
  type SpotifyPlaylist,
  type SpotifyTrack,
} from '../services/spotify';
import { useStore } from '../store/useStore';
import type { Song } from '../types';
import { isSameTrack } from '../utils/syncedLyrics';
import { Text } from './Text';

const SPOTIFY_GREEN = '#1DB954';

interface SpotifyPlaylistsProps {
  onClose: () => void;
  onOpen: (song: Song) => void;
  onFetch: (songName: string, artistName: string) => void;
  isWide?: boolean;
}

/** One of the user's Spotify playlists against the saved songs: Learn the saved ones, get lyrics for the rest */
export default function SpotifyPlaylists({ onClose, onOpen, onFetch, isWide }: SpotifyPlaylistsProps) {
  const songs = useStore((s) => s.songs);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[] | null>(null);
  const [privateOk, setPrivateOk] = useState(true);
  const [playlist, setPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrack[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSpotifyPlaylists().then(setPlaylists, (e) => setError(spotifyErrorMessage(e)));
    void canReadPrivatePlaylists().then(setPrivateOk);
  }, []);

  useEffect(() => {
    if (!playlist) return;
    setTracks(null);
    getSpotifyPlaylistTracks(playlist.id).then(setTracks, (e) => setError(spotifyErrorMessage(e)));
  }, [playlist]);

  const savedSong = (track: SpotifyTrack) =>
    songs.find((s) => isSameTrack(s.songName, s.artistName ?? '', track.name, track.artists));
  const savedCount = tracks?.filter((t) => savedSong(t)).length ?? 0;

  let body: React.ReactNode;
  if (error) {
    body = <Text style={styles.message}>{error}</Text>;
  } else if (!playlist) {
    body = !playlists ? (
      <ActivityIndicator color={SPOTIFY_GREEN} style={styles.loading} />
    ) : (
      <FlatList
        data={playlists}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={<Text style={styles.message}>No playlists on this Spotify account.</Text>}
        ListFooterComponent={
          privateOk ? null : (
            <Text style={styles.hint}>Private playlists show once you disconnect and connect Spotify again in the sidebar.</Text>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => setPlaylist(item)} accessibilityRole="button" accessibilityLabel={`Open ${item.name}`}>
            <Ionicons name="list" size={18} color={SPOTIFY_GREEN} />
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.meta}>{item.trackCount}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      />
    );
  } else {
    body = !tracks ? (
      <ActivityIndicator color={SPOTIFY_GREEN} style={styles.loading} />
    ) : (
      <FlatList
        data={tracks}
        keyExtractor={(t, i) => `${i}-${t.name}`}
        ListHeaderComponent={<Text style={styles.summary}>{`${savedCount} of ${tracks.length} saved`}</Text>}
        renderItem={({ item }) => {
          const song = savedSong(item);
          const firstArtist = item.artists.split(', ')[0] ?? '';
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => {
                onClose();
                if (song) onOpen(song);
                else onFetch(item.name, firstArtist);
              }}
              accessibilityRole="button"
              accessibilityLabel={song ? `Open ${item.name} in Learn` : `Get the lyrics for ${item.name}`}
            >
              <Ionicons
                name={song ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={song ? Colors.success : Colors.textMuted}
              />
              <View style={styles.track}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>{item.artists}</Text>
              </View>
              <Text style={song ? styles.learn : styles.getLyrics}>{song ? 'Learn' : 'Get lyrics'}</Text>
            </TouchableOpacity>
          );
        }}
      />
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isWide && styles.cardWide]}>
          <View style={styles.header}>
            {playlist && (
              <TouchableOpacity
                onPress={() => {
                  setPlaylist(null);
                  setTracks(null);
                  setError(null);
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Back to playlists"
              >
                <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
            <Text style={styles.title} numberOfLines={1}>{playlist ? playlist.name : 'Your Spotify playlists'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close playlists">
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {body}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
  },
  cardWide: { maxWidth: 640 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text },
  loading: { marginVertical: 24 },
  message: { fontSize: 14, color: Colors.textSecondary, paddingVertical: 12 },
  hint: { fontSize: 12, color: Colors.textMuted, paddingTop: 10 },
  summary: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  track: { flex: 1 },
  name: { flex: 1, fontSize: 14, color: Colors.text },
  meta: { fontSize: 12, color: Colors.textMuted },
  learn: { fontSize: 13, fontWeight: '600', color: Colors.success },
  getLyrics: { fontSize: 13, fontWeight: '600', color: Colors.primaryLight },
});
