import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import type { WiktionaryAudio } from '../utils/wiktionary';
import AudioPlayer, { type AudioPlayerHandle } from './AudioPlayer';
import { Text } from './Text';
import { shortAudioLabels } from '../utils/audioLabels';

interface Props {
  audio: WiktionaryAudio[];
  /** Small pills that sit inline, e.g. next to the IPA */
  compact?: boolean;
  /** Plays the first recording when it shows, e.g. for a listening quiz */
  autoPlay?: boolean;
  /** Short accent codes, e.g. "AT" for Austria, with the full name shown while it plays or for a moment when held */
  short?: boolean;
  /** Only the first recording, with a button that shows the others */
  collapsed?: boolean;
}

/** Buttons that play the word's Wiktionary pronunciation recordings, labeled by accent */
export default function PronunciationAudio({ audio, compact = false, autoPlay = false, short = false, collapsed = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const playerRef = useRef<AudioPlayerHandle>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  useEffect(() => setPlayingUrl(null), [audio]);
  // The recording whose full accent name shows for a moment after a long press
  const [heldUrl, setHeldUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!heldUrl) return;
    const timer = setTimeout(() => setHeldUrl(null), 2500);
    return () => clearTimeout(timer);
  }, [heldUrl]);
  const shortLabels = short ? shortAudioLabels(audio.map((item) => item.label)) : [];

  // Once per first recording shown
  const firstUrl = audio[0]?.url;
  useEffect(() => {
    if (!autoPlay || !firstUrl) return;
    setPlayingUrl(firstUrl);
    playerRef.current?.play(firstUrl);
  }, [autoPlay, firstUrl]);

  if (audio.length === 0) return null;

  const play = (url: string) => {
    setPlayingUrl(url);
    playerRef.current?.play(url);
  };

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {(collapsed && !expanded ? audio.slice(0, 1) : audio).map((item, index) => {
        const playing = playingUrl === item.url;
        return (
          <TouchableOpacity
            key={item.url}
            style={[styles.button, compact && styles.buttonCompact, playing && styles.buttonPlaying]}
            onPress={() => play(item.url)}
            onLongPress={short && item.label ? () => setHeldUrl(item.url) : undefined}
            accessibilityRole="button"
            accessibilityLabel={`Play pronunciation${item.label ? ` (${item.label})` : ''}`}
          >
            <Ionicons
              name={playing ? 'volume-high' : 'volume-medium-outline'}
              size={compact ? 14 : 16}
              color={playing ? Colors.white : compact ? Colors.primaryLight : Colors.primary}
            />
            {short && ((heldUrl !== item.url && !playing) || !item.label) ? (
              shortLabels[index] ? (
                <Text style={[styles.buttonText, compact && styles.buttonTextCompact, playing && styles.buttonTextPlaying]}>
                  {shortLabels[index]}
                </Text>
              ) : null
            ) : (
              <Text
                style={[styles.buttonText, compact && styles.buttonTextCompact, playing && styles.buttonTextPlaying]}
              >
                {item.label || (audio.length > 1 ? `Audio ${index + 1}` : 'Audio')}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
      {collapsed && audio.length > 1 && (
        <TouchableOpacity
          style={[styles.button, compact && styles.buttonCompact, styles.moreButton]}
          onPress={() => setExpanded((open) => !open)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Show fewer recordings' : `Show ${audio.length - 1} more recordings`}
        >
          <Ionicons name={expanded ? 'chevron-back' : 'chevron-down'} size={14} color={Colors.primaryLight} />
        </TouchableOpacity>
      )}
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
  moreButton: {
    paddingLeft: 6,
    paddingRight: 6,
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
