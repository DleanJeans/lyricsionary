import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { getWiktionaryPronunciation, type WiktionaryAudio } from '../utils/wiktionary';
import { useStore } from '../store/useStore';
import AudioPlayer, { type AudioPlayerHandle } from './AudioPlayer';
import { Text } from './Text';
import { shortAudioLabels } from '../utils/audioLabels';

interface Props {
  audio: WiktionaryAudio[];
  /** Small pills that sit inline, e.g. next to the IPA */
  compact?: boolean;
  /** Plays the first recording when it shows, e.g. for a listening quiz */
  autoPlay?: boolean;
  /** Short accent codes, e.g. "AT" for Austria, always short so the row keeps one height */
  short?: boolean;
  /** Only the first recording, with a button that shows the others */
  collapsed?: boolean;
  /** A saved word whose recordings can be fixed here: wrong ones removed, or all fetched again from Wiktionary */
  wordId?: string;
}

/** Buttons that play the word's Wiktionary pronunciation recordings, labeled by accent */
export default function PronunciationAudio({ audio: audioProp, compact = false, autoPlay = false, short = false, collapsed = false, wordId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const word = useStore((s) => (wordId ? s.words.find((w) => w.id === wordId) : undefined));
  const setWordAudio = useStore((s) => s.setWordAudio);
  const removeWordAudio = useStore((s) => s.removeWordAudio);
  const restoreWordAudio = useStore((s) => s.restoreWordAudio);
  // The saved recordings, so a fix shows at once even where the word was passed in as a snapshot
  const audio = word?.audio ?? audioProp;
  const [fixing, setFixing] = useState(false);
  const [reloading, setReloading] = useState(false);
  // Set when a fetch came back without any (more) recordings
  const [none, setNone] = useState(false);
  // The last recording flagged, so it can be put back
  const [removed, setRemoved] = useState<{ item: WiktionaryAudio; index: number } | null>(null);
  const reload = async () => {
    if (!word) return;
    setReloading(true);
    setNone(false);
    try {
      const result = await getWiktionaryPronunciation(word.word, word.language);
      if (result) {
        await setWordAudio(word.id, result.audio);
        // Recordings flagged as wrong don't count
        setNone(result.audio.every((a) => word.removedAudio?.includes(a.url)));
      } else {
        setNone(true);
      }
    } catch {
      setNone(true);
    } finally {
      setReloading(false);
    }
  };
  const remove = async (item: WiktionaryAudio, index: number) => {
    if (!word) return;
    setRemoved({ item, index });
    await removeWordAudio(word.id, item.url);
    // Look for the next recording right away, so the word isn't left without one
    if (audio.length <= 1) void reload();
  };
  const playerRef = useRef<AudioPlayerHandle>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  useEffect(() => setPlayingUrl(null), [audio]);
  const shortLabels = short ? shortAudioLabels(audio.map((item) => item.label)) : [];

  // Once per first recording shown
  const firstUrl = audio[0]?.url;
  useEffect(() => {
    if (!autoPlay || !firstUrl) return;
    setPlayingUrl(firstUrl);
    playerRef.current?.play(firstUrl);
  }, [autoPlay, firstUrl]);

  if (audio.length === 0 && !word) return null;

  const play = (url: string) => {
    setPlayingUrl(url);
    playerRef.current?.play(url);
  };

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {(collapsed && !expanded && !fixing ? audio.slice(0, 1) : audio).map((item, index) => {
        const playing = playingUrl === item.url;
        return (
          <TouchableOpacity
            key={item.url}
            style={[styles.button, compact && styles.buttonCompact, playing && styles.buttonPlaying]}
            onPress={fixing && word ? () => void remove(item, index) : () => play(item.url)}
            accessibilityRole="button"
            accessibilityLabel={`Play pronunciation${item.label ? ` (${item.label})` : ''}`}
          >
            <Ionicons
              name={fixing ? 'close-circle' : playing ? 'volume-high' : 'volume-medium-outline'}
              size={compact ? 14 : 16}
              color={playing ? Colors.white : compact ? Colors.primaryLight : Colors.primary}
            />
            {short ? (
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
      {fixing && word && removed && (
        <TouchableOpacity
          style={[styles.button, compact && styles.buttonCompact, styles.moreButton]}
          onPress={() => {
            void restoreWordAudio(word.id, removed.item, removed.index);
            setRemoved(null);
            setNone(false);
          }}
          accessibilityRole="button"
          accessibilityLabel="Undo removing the recording"
        >
          <Ionicons name="arrow-undo" size={14} color={Colors.primaryLight} />
          <Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>Undo</Text>
        </TouchableOpacity>
      )}
      {(audio.length === 0 || fixing) && word && (
        <TouchableOpacity
          style={[styles.button, compact && styles.buttonCompact, styles.moreButton]}
          onPress={() => void reload()}
          disabled={reloading}
          accessibilityRole="button"
          accessibilityLabel="Fetch the recordings from Wiktionary again"
        >
          {reloading ? <ActivityIndicator size="small" color={Colors.primaryLight} /> : <Ionicons name="refresh" size={14} color={Colors.primaryLight} />}
          {audio.length === 0 && (
            <Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>{none ? 'No audio found, retry' : 'Fetch audio'}</Text>
          )}
        </TouchableOpacity>
      )}
      {word && audio.length > 0 && (
        <TouchableOpacity
          style={[styles.button, compact && styles.buttonCompact, styles.moreButton]}
          onPress={() => setFixing((on) => !on)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={fixing ? 'Done fixing recordings' : 'Wrong audio? Remove a recording'}
        >
          <Ionicons name={fixing ? 'checkmark' : 'flag-outline'} size={14} color={Colors.primaryLight} />
        </TouchableOpacity>
      )}
      {collapsed && !fixing && audio.length > 1 && (
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
