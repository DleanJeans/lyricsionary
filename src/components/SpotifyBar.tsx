import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import type { SpotifyLyricsSync } from '../hooks/useSpotifyLyricsSync';
import { Text } from './Text';

const SPOTIFY_GREEN = '#1DB954';

function ControlButton({ icon, label, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.control, disabled && styles.controlDisabled]}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={Colors.text} />
    </TouchableOpacity>
  );
}

/** Spotify controls above the lyrics in Learn: replay, step and play by line */
export default function SpotifyBar({
  sync,
  selectedLineIndex,
  follow,
  onToggleFollow,
  onDictation,
  onDismiss,
}: {
  sync: SpotifyLyricsSync;
  /** The line of the tapped word, to play from */
  selectedLineIndex: number | null;
  follow: boolean;
  onToggleFollow: () => void;
  /** Hides the line and plays it, to write it down */
  onDictation?: (lineIndex: number) => void;
  /** Hides the bar for this song, offered when the song has no synced lyrics */
  onDismiss?: () => void;
}) {
  const canPlaySelected = selectedLineIndex !== null && sync.times[selectedLineIndex] != null;
  // Loops the tapped word's line, or else the one playing
  const lineToLoop = canPlaySelected ? selectedLineIndex : sync.isThisSong ? sync.currentLine : null;
  const looping = sync.loopLine !== null;
  const status =
    sync.error ??
    (sync.timings === 'loading'
      ? 'Looking for synced lyrics...'
      : sync.timings === 'none'
        ? 'No synced lyrics found for this song'
        : !sync.isThisSong
          ? 'Not playing on Spotify'
          : null);
  return (
    <View style={styles.container}>
      <Ionicons name="musical-note" size={16} color={SPOTIFY_GREEN} />
      {status ? (
        <Text style={styles.status} numberOfLines={1}>
          {status}
        </Text>
      ) : (
        <View style={styles.spacer} />
      )}
      {sync.timings === 'none' && onDismiss && (
        <TouchableOpacity onPress={onDismiss} hitSlop={8} accessibilityRole="button" accessibilityLabel="Hide this">
          <Ionicons name="close" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      )}
      {sync.timings === 'ready' && (
        <View style={styles.controls}>
          {canPlaySelected && (
            <TouchableOpacity
              style={styles.fromLine}
              onPress={() => void sync.seekToLine(selectedLineIndex!)}
              accessibilityRole="button"
              accessibilityLabel="Play from the selected line"
            >
              <Ionicons name="play" size={14} color={Colors.white} />
              <Text style={styles.fromLineText}>Line</Text>
            </TouchableOpacity>
          )}
          {canPlaySelected && onDictation && (
            <ControlButton icon="create-outline" label="Write the line from listening" onPress={() => onDictation(selectedLineIndex!)} />
          )}
          {(looping || lineToLoop !== null) && (
            <TouchableOpacity
              style={[styles.loop, looping && styles.loopOn]}
              onPress={() => sync.toggleLoop(lineToLoop)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={looping ? 'Stop looping the line' : 'Loop the line'}
            >
              <Ionicons name="repeat" size={18} color={looping ? Colors.white : Colors.text} />
              {looping && sync.loopCount > 0 && <Text style={styles.loopCount}>{sync.loopCount}</Text>}
            </TouchableOpacity>
          )}
          {sync.isThisSong && (
            <>
              <ControlButton icon="play-skip-back" label="Previous line" onPress={() => void sync.stepLine(-1)} />
              <ControlButton icon="refresh" label="Replay the line" onPress={() => void sync.replayLine()} disabled={sync.currentLine === null} />
              <ControlButton icon={sync.isPlaying ? 'pause' : 'play'} label={sync.isPlaying ? 'Pause' : 'Play'} onPress={() => void sync.togglePlay()} />
              <ControlButton icon="play-skip-forward" label="Next line" onPress={() => void sync.stepLine(1)} />
              <TouchableOpacity onPress={onToggleFollow} hitSlop={6} accessibilityRole="button" accessibilityLabel={follow ? 'Stop following the song' : 'Follow the song'}>
                <Ionicons name={follow ? 'locate' : 'locate-outline'} size={20} color={follow ? SPOTIFY_GREEN : Colors.textSecondary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  status: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  spacer: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  control: {
    padding: 2,
  },
  controlDisabled: {
    opacity: 0.4,
  },
  fromLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: SPOTIFY_GREEN,
  },
  loop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  loopOn: {
    backgroundColor: SPOTIFY_GREEN,
  },
  loopCount: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  fromLineText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
});
