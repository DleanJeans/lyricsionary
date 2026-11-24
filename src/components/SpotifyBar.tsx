import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, TouchableOpacity, View } from 'react-native';
import FoldAway, { useSwipe } from './FoldAway';
import { usePersistedState } from '../hooks/usePersistedState';
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

function LabeledButton({ icon, label, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity style={[styles.labeled, disabled && styles.controlDisabled]} onPress={onPress} disabled={disabled} hitSlop={6} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={20} color={Colors.text} />
      <Text style={styles.caption}>{label}</Text>
    </TouchableOpacity>
  );
}

function TogglePill({ icon, label, on, onPress, accent }: { icon: keyof typeof Ionicons.glyphMap; label: string; on?: boolean; onPress: () => void; accent?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.pill, on && styles.pillOn, accent && styles.pillAccent]}
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={on === undefined ? undefined : { selected: on }}
    >
      <Ionicons name={icon} size={14} color={on ? '#000' : Colors.text} />
      <Text style={[styles.pillText, on && { color: '#000' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** A bar that glides to each new progress instead of jumping, and snaps when the line changes or goes back */
function LineProgress({ value, line, playing }: { value: number; line: number | null; playing: boolean }) {
  const anim = useRef(new Animated.Value(value)).current;
  const prev = useRef({ value, line });
  useEffect(() => {
    const before = prev.current;
    prev.current = { value, line };
    anim.stopAnimation();
    if (line !== before.line || value < before.value || !playing) {
      anim.setValue(value);
      return;
    }
    Animated.timing(anim, { toValue: value, duration: 450, easing: Easing.linear, useNativeDriver: false }).start();
  }, [value, line, playing, anim]);
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.trackFill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

/** Spotify controls above the lyrics in Learn: play the song, then replay, step and play by line */
function SpotifyBarBody({
  sync,
  selectedLineIndex,
  follow,
  onToggleFollow,
  onDictation,
  onDismiss,
  hideStatus,
  dueCount = 0,
  onReview,
  onHide,
}: {
  sync: SpotifyLyricsSync;
  /** The line of the tapped word, to play from */
  selectedLineIndex: number | null;
  follow: boolean;
  onToggleFollow: () => void;
  /** Hides the line and plays it, to write it down */
  onDictation?: (lineIndex: number) => void;
  /** Hides the bar for good for a song with no synced lyrics */
  onDismiss?: () => void;
  /** Leaves out the status once it was closed, keeping the Play button */
  hideStatus?: boolean;
  /** The song's due words, to review from the bar while it plays */
  dueCount?: number;
  onReview?: () => void;
  /** A second swipe up, on the already folded bar, slides the whole bar away */
  onHide: () => void;
}) {
  // Folds the controls away to just the header, remembered across launches
  const [collapsed, setCollapsed] = usePersistedState('@lyricsionary_spotify_bar_collapsed', false, (v): v is boolean => typeof v === 'boolean');
  // 1 with the controls out, 0 folded under the header: they slide and fade with it
  const open = useRef(new Animated.Value(1)).current;
  const [controlsHeight, setControlsHeight] = React.useState<number | null>(null);
  useEffect(() => {
    Animated.timing(open, { toValue: collapsed ? 0 : 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [collapsed, open]);
  // Swipe up folds the controls, again slides the bar away; swipe down unfolds them
  const swipe = useSwipe(
    () => (collapsed ? onHide() : setCollapsed(true)),
    () => collapsed && setCollapsed(false)
  );
  // Line, dictation and loop only work once Spotify plays this song
  const canPlaySelected = sync.isThisSong && selectedLineIndex !== null && sync.times[selectedLineIndex] != null;
  // Loops the tapped word's line, or else the one playing
  const lineToLoop = canPlaySelected ? selectedLineIndex : sync.isThisSong ? sync.currentLine : null;
  const looping = sync.loopLine !== null;
  const status =
    sync.error ??
    (hideStatus && !sync.isThisSong
      ? null
      : hideStatus
      ? sync.isPlaying
        ? 'Playing on Spotify, no synced lyrics'
        : 'Paused on Spotify, no synced lyrics'
      : sync.timings === 'loading'
      ? 'Looking for synced lyrics...'
      : sync.timings === 'none'
        ? 'No synced lyrics found for this song'
        : !sync.isThisSong
          ? sync.queued
            ? 'In your queue'
            : 'Not playing on Spotify'
          : null);
  const reviewPill =
    onReview && dueCount > 0 && sync.isThisSong ? (
      <TogglePill icon="flash-outline" label={`Review ${dueCount} from this song`} onPress={onReview} accent />
    ) : null;
  return (
    <View style={styles.container}>
      {!(sync.timings === 'ready' && sync.isThisSong) && <Ionicons name="musical-note" size={16} color={SPOTIFY_GREEN} />}
      {status ? (
        <Text style={styles.status} numberOfLines={1}>
          {status}
        </Text>
      ) : null}
      {!sync.isThisSong && (
        <TouchableOpacity
          style={styles.queue}
          onPress={() => void sync.queueSong()}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={sync.queued ? 'Skip to this song in the Spotify queue' : 'Add this song to the Spotify queue'}
        >
          <Ionicons name={sync.queued ? 'play-skip-forward' : 'list'} size={14} color={sync.queued ? SPOTIFY_GREEN : Colors.text} />
          <Text style={styles.queueText}>{sync.queued ? 'Play now' : 'Queue'}</Text>
        </TouchableOpacity>
      )}
      {!sync.isThisSong && !sync.queued && (
        <TouchableOpacity
          style={[styles.fromLine, sync.startingSong && styles.controlDisabled]}
          onPress={() => void sync.playSong()}
          disabled={sync.startingSong}
          accessibilityRole="button"
          accessibilityLabel="Play this song on Spotify"
        >
          <Ionicons name="play" size={14} color={Colors.white} />
          <Text style={styles.fromLineText}>{sync.startingSong ? 'Starting...' : 'Play'}</Text>
        </TouchableOpacity>
      )}
      {sync.timings !== 'ready' && reviewPill}
      {sync.timings !== 'ready' && sync.isThisSong && (
        <ControlButton icon={sync.isPlaying ? 'pause' : 'play'} label={sync.isPlaying ? 'Pause' : 'Play'} onPress={() => void sync.togglePlay()} />
      )}
      {sync.timings !== 'ready' && sync.isThisSong && (
        <TouchableOpacity
          style={[styles.control, sync.repeating && styles.repeatOn]}
          onPress={() => void sync.toggleRepeat()}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="On repeat"
          accessibilityState={{ selected: sync.repeating }}
        >
          <Ionicons name="infinite" size={20} color={sync.repeating ? '#000' : Colors.text} />
        </TouchableOpacity>
      )}
      {status && (sync.error || onDismiss) && (
        <TouchableOpacity
          onPress={sync.error ? sync.clearError : onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Hide this"
        >
          <Ionicons name="close" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      )}
      {sync.timings === 'ready' && sync.isThisSong && (
        <View style={styles.full} {...swipe.panHandlers}>
          <View style={styles.headRow}>
            <TouchableOpacity
              style={styles.headTouch}
              onPress={() => setCollapsed(!collapsed)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={collapsed ? 'Show the Spotify controls' : 'Hide the Spotify controls'}
            >
              <Ionicons name="musical-note" size={14} color={SPOTIFY_GREEN} />
              <Text style={[styles.headText, { flex: 1 }]} numberOfLines={1}>
                {sync.currentLine !== null ? `Line ${sync.currentLine + 1} of ${sync.times.length}` : 'Between lines'}
              </Text>
              <Text style={styles.headState}>{looping ? `Looping ×${sync.loopCount}` : sync.isPlaying ? 'Playing' : 'Paused'}</Text>
              <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
            {collapsed && (
              <TouchableOpacity
                style={styles.miniPlay}
                onPress={() => void sync.togglePlay()}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={sync.isPlaying ? 'Pause' : 'Play'}
              >
                <Ionicons name={sync.isPlaying ? 'pause' : 'play'} size={14} color="#000" />
              </TouchableOpacity>
            )}
          </View>
          <LineProgress value={sync.lineProgress} line={sync.currentLine} playing={sync.isPlaying} />
          <Animated.View
            style={{
              overflow: 'hidden',
              opacity: open,
              height: controlsHeight === null ? undefined : open.interpolate({ inputRange: [0, 1], outputRange: [0, controlsHeight] }),
            }}
            pointerEvents={collapsed ? 'none' : 'auto'}
          >
            <View
              style={[styles.controlsBody, controlsHeight !== null && styles.controlsMeasured]}
              onLayout={(e) => setControlsHeight(e.nativeEvent.layout.height)}
            >
          <View style={styles.transport}>
            <LabeledButton icon="play-skip-back" label="Prev line" onPress={() => void sync.stepLine(-1)} />
            <LabeledButton icon="refresh" label="Restart line" onPress={() => void sync.replayLine()} disabled={sync.currentLine === null} />
            <TouchableOpacity
              style={styles.big}
              onPress={() => void sync.togglePlay()}
              accessibilityRole="button"
              accessibilityLabel={sync.isPlaying ? 'Pause' : 'Play'}
            >
              <Ionicons name={sync.isPlaying ? 'pause' : 'play'} size={24} color="#000" />
            </TouchableOpacity>
            <LabeledButton icon="play-skip-forward" label="Next line" onPress={() => void sync.stepLine(1)} />
          </View>
          <View style={styles.toggles}>
            {(looping || lineToLoop !== null) && (
              <TogglePill
                icon="repeat"
                label={looping && sync.loopCount > 0 ? `Loop line · ${sync.loopCount}` : 'Loop line'}
                on={looping}
                onPress={() => sync.toggleLoop(lineToLoop)}
              />
            )}
            <TogglePill icon="infinite" label="On repeat" on={sync.repeating} onPress={() => void sync.toggleRepeat()} />
            <TogglePill icon={follow ? 'locate' : 'locate-outline'} label="Auto-scroll" on={follow} onPress={onToggleFollow} />
            {canPlaySelected && <TogglePill icon="play" label="Play line" onPress={() => void sync.seekToLine(selectedLineIndex!)} accent />}
            {reviewPill}
            {canPlaySelected && onDictation && <TogglePill icon="create-outline" label="Dictate" onPress={() => onDictation(selectedLineIndex!)} accent />}
          </View>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

export default function SpotifyBar({
  hidden,
  onHiddenChange,
  ...props
}: Omit<React.ComponentProps<typeof SpotifyBarBody>, 'onHide'> & { hidden: boolean; onHiddenChange: (hidden: boolean) => void }) {
  // Only the whole-song controls slide away; the Play and Queue states always stay
  const away = hidden && props.sync.timings === 'ready' && props.sync.isThisSong;
  return (
    <FoldAway collapsed={away}>
      <SpotifyBarBody {...props} onHide={() => onHiddenChange(true)} />
    </FoldAway>
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
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // With the whole song's controls there's no status, so they share the row instead of running past its end
  controlsFull: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 2,
  },
  control: {
    padding: 2,
  },
  full: { flex: 1, paddingVertical: 4 },
  controlsBody: { gap: 10, paddingTop: 10 },
  controlsMeasured: { position: 'absolute', left: 0, right: 0, top: 0 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headTouch: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniPlay: { width: 26, height: 26, borderRadius: 13, backgroundColor: SPOTIFY_GREEN, alignItems: 'center', justifyContent: 'center' },
  headText: { fontSize: 12, fontWeight: '700', color: Colors.text },
  headState: { fontSize: 12, color: Colors.textSecondary },
  track: { marginTop: 10, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceLight, overflow: 'hidden' },
  trackFill: { height: 4, backgroundColor: SPOTIFY_GREEN },
  transport: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  labeled: { alignItems: 'center', gap: 2, minWidth: 56 },
  caption: { fontSize: 10, color: Colors.textSecondary },
  big: { width: 44, height: 44, borderRadius: 22, backgroundColor: SPOTIFY_GREEN, alignItems: 'center', justifyContent: 'center' },
  toggles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: Colors.border },
  pillOn: { backgroundColor: SPOTIFY_GREEN, borderColor: SPOTIFY_GREEN },
  pillAccent: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: 12, fontWeight: '700', color: Colors.text },
  repeatOn: { backgroundColor: SPOTIFY_GREEN, borderRadius: 999 },
  controlDisabled: {
    opacity: 0.4,
  },
  queue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  queueText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
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
