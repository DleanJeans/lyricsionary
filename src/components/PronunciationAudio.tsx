import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import type { WiktionaryAudio } from '../utils/wiktionary';
import AudioPlayer, { type AudioPlayerHandle } from './AudioPlayer';
import { Text } from './Text';

interface Props {
  audio: WiktionaryAudio[];
  /** Small pills that sit inline, e.g. next to the IPA */
  compact?: boolean;
}

/** Buttons that play the word's Wiktionary pronunciation recordings, labeled by accent */
export default function PronunciationAudio({ audio, compact = false }: Props) {
  const playerRef = useRef<AudioPlayerHandle>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  useEffect(() => setPlayingUrl(null), [audio]);

  if (audio.length === 0) return null;

  const play = (url: string) => {
    setPlayingUrl(url);
    playerRef.current?.play(url);
  };

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {audio.map((item, index) => {
        const playing = playingUrl === item.url;
        return (
          <TouchableOpacity
            key={item.url}
            style={[styles.button, compact && styles.buttonCompact, playing && styles.buttonPlaying]}
            onPress={() => play(item.url)}
            accessibilityRole="button"
            accessibilityLabel={`Play pronunciation${item.label ? ` (${item.label})` : ''}`}
          >
            <Ionicons
              name={playing ? 'volume-high' : 'volume-medium-outline'}
              size={compact ? 14 : 16}
              color={playing ? Colors.white : compact ? Colors.primaryLight : Colors.primary}
            />
            <Text
              style={[styles.buttonText, compact && styles.buttonTextCompact, playing && styles.buttonTextPlaying]}
            >
              {item.label || (audio.length > 1 ? `Audio ${index + 1}` : 'Audio')}
            </Text>
          </TouchableOpacity>
        );
      })}
      <AudioPlayer
        ref={playerRef}
        onFinished={(url) => setPlayingUrl((current) => (current === url ? null : current))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  rowCompact: {
    gap: 6,
    marginTop: 0,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonCompact: {
    gap: 4,
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    borderRadius: 999,
    paddingLeft: 7,
    paddingRight: 9,
    paddingVertical: 3,
    borderWidth: 0,
  },
  buttonPlaying: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  buttonText: {
    color: Colors.text,
    fontSize: 14,
  },
  buttonTextCompact: {
    color: Colors.primaryLight,
    fontSize: 12,
  },
  buttonTextPlaying: {
    color: Colors.white,
  },
});
