import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import {
  getSpotifyClientId,
  setSpotifyClientId,
  signOutOfSpotify,
  spotifyErrorMessage,
  spotifyRedirectUri,
  startSpotifySignIn,
} from '../services/spotify';
import { useStore } from '../store/useStore';
import { Text, TextInput } from './Text';

/** Signs in to Spotify with the user's own app's client ID, for seeking by lyric line in Learn */
export default function SpotifyConnect() {
  const connected = useStore((s) => s.spotifyConnected);
  const setConnected = useStore((s) => s.setSpotifyConnected);
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void getSpotifyClientId().then(setClientId);
  }, []);

  const connect = async () => {
    setError(null);
    try {
      await setSpotifyClientId(clientId);
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
          <Text style={styles.text}>
            Seek Spotify by lyric line in Learn (needs Premium). Make an app at developer.spotify.com with this redirect URI, then paste its client ID:
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
          <TouchableOpacity
            style={[styles.button, !clientId.trim() && styles.buttonDisabled]}
            onPress={() => void connect()}
            disabled={!clientId.trim()}
            accessibilityRole="button"
            accessibilityLabel="Connect Spotify"
          >
            <Text style={styles.buttonText}>Connect Spotify</Text>
          </TouchableOpacity>
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
