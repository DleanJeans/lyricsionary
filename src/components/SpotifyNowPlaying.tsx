import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { getSpotifyPlayback, type SpotifyPlayback } from '../services/spotify';
import { useStore } from '../store/useStore';
import type { Song } from '../types';
import { isSameTrack } from '../utils/syncedLyrics';
import { Text } from './Text';

const SPOTIFY_GREEN = '#1DB954';
const POLL_MS = 10_000;

/** Above the songs: what Spotify is playing, opened in Learn when saved, or its lyrics fetched when not */
export default function SpotifyNowPlaying({
  onOpen,
  onFetch,
}: {
  onOpen: (song: Song) => void;
  onFetch: (songName: string, artistName: string) => void;
}) {
  const connected = useStore((s) => s.spotifyConnected);
  const songs = useStore((s) => s.songs);
  const focused = useIsFocused();
  const [playback, setPlayback] = useState<SpotifyPlayback | null>(null);

  useEffect(() => {
    if (!connected || !focused) return;
    const refresh = () => getSpotifyPlayback().then(setPlayback, () => setPlayback(null));
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [connected, focused]);

  if (!connected || !playback?.isPlaying || !playback.trackName) return null;
  const saved = songs.find((s) => isSameTrack(s.songName, s.artistName ?? '', playback.trackName, playback.artists));
  // Spotify lists every artist; the first one is what a lyrics search needs
  const firstArtist = playback.artists.split(', ')[0] ?? '';

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => (saved ? onOpen(saved) : onFetch(playback.trackName, firstArtist))}
      accessibilityRole="button"
      accessibilityLabel={saved ? `Open ${playback.trackName} in Learn` : `Get the lyrics for ${playback.trackName}`}
    >
      <Ionicons name="musical-note" size={18} color={SPOTIFY_GREEN} />
      <View style={styles.text}>
        <Text style={styles.label}>Playing on Spotify</Text>
        <Text style={styles.track} numberOfLines={1}>
          {playback.trackName} · {playback.artists}
        </Text>
      </View>
      <Text style={styles.action}>{saved ? 'Learn' : 'Get lyrics'}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.4)',
  },
  text: { flex: 1 },
  label: { fontSize: 11, color: SPOTIFY_GREEN, fontWeight: '600' },
  track: { fontSize: 14, color: Colors.text },
  action: { fontSize: 13, color: Colors.primaryLight, fontWeight: '600' },
});
