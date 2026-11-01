import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import {
  getCustomSpotifyClientId,
  setSpotifyClientId,
  signOutOfSpotify,
  spotifyErrorMessage,
  spotifyRedirectUri,
  startSpotifySignIn,
} from '../services/spotify';
import { useStore } from '../store/useStore';
import { Text, TextInput } from './Text';

/** Signs in to Spotify (Lyricsionary's app, or the user's own), for seeking by lyric line in Learn */
export default function SpotifyConnect() {
  const connected = useStore((s) => s.spotifyConnected);
  const setConnected = useStore((s) => s.setSpotifyConnected);
  const [clientId, setClientId] = useState('');
  const [ownApp, setOwnApp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void getCustomSpotifyClientId().then((id) => {
      setClientId(id);
      setOwnApp(!!id);
    });
  }, []);

  const connect = async () => {
    setError(null);
    try {
      await setSpotifyClientId(ownApp ? clientId : '');
      await startSpotifySignIn();
    } catch (e) {
      setError(spotifyErrorMessage(e));
    }
  };

  const disconnect = async () => {
    await signOutOfSpotify();
    setConnected(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spotify</Text>
      {connected ? (
        <View style={styles.row}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
          <Text style={styles.text}>Connected. Learn follows the song and seeks by line.</Text>
          <TouchableOpacity onPress={() => void disconnect()} accessibilityRole="button" accessibilityLabel="Disconnect Spotify">
            <Text style={styles.link}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.text}>Follow along and jump to any lyric line in Learn (seeking needs Premium).</Text>
          <TouchableOpacity
            style={[styles.button, ownApp && !clientId.trim() && styles.buttonDisabled]}
            onPress={() => void connect()}
            disabled={ownApp && !clientId.trim()}
            accessibilityRole="button"
            accessibilityLabel="Connect Spotify"
          >
            <Text style={styles.buttonText}>Connect Spotify</Text>
          </TouchableOpacity>
          {ownApp ? (
            <>
              <Text style={styles.hint}>
                Use your own app from developer.spotify.com with this redirect URI, and paste its client ID:
              </Text>
              <Text style={styles.code} selectable>
                {spotifyRedirectUri()}
              </Text>
              <TextInput
                style={styles.input}
                value={clientId}
                onChangeText={setClientId}
                placeholder="Client ID"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Spotify client ID"
              />
              <TouchableOpacity onPress={() => setOwnApp(false)} accessibilityRole="button">
                <Text style={styles.subtleLink}>Use Lyricsionary's app</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setOwnApp(true)} accessibilityRole="button">
              <Text style={styles.subtleLink}>Use your own Spotify app</Text>
            </TouchableOpacity>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    flexShrink: 1,
    fontSize: 13,
    color: Colors.text,
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  subtleLink: {
    fontSize: 12,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  code: {
    fontSize: 12,
    color: Colors.primaryLight,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.danger,
  },
  input: {
    fontSize: 14,
    color: Colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  button: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1DB954',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  error: {
    fontSize: 12,
    color: Colors.danger,
  },
});
