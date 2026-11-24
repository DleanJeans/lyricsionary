import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ToastAndroid, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/theme';
import { getSpotifyPlayback, pauseSpotify, playSongOnSpotify, resumeSpotify, seekSpotify, spotifyErrorMessage } from '../services/spotify';
import { getSyncedLyrics } from '../services/syncedLyrics';
import type { Song } from '../types';
import { isSameTrack, lineEndTime, matchSyncedLines, parseLrc } from '../utils/syncedLyrics';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Plays just this line of the song on Spotify, then pauses; shown only when the song has synced lyrics */
export default function PlayLineButton({ song, line, size = 15, style }: { song?: Song; line: string; size?: number; style?: object }) {
  const [lrc, setLrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const runRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLrc(null);
    if (song) void getSyncedLyrics(song).then((found) => !cancelled && setLrc(found));
    return () => {
      cancelled = true;
    };
  }, [song?.id]);

  const times = useMemo(() => {
    if (!song || !lrc) return null;
    const lines = song.originalLyrics.split('\n').map((l) => l.trim());
    const matched = matchSyncedLines(lines, parseLrc(lrc));
    const target = line.trim();
    const index = lines.findIndex((l, i) => l === target && matched[i] !== null);
    return index < 0 ? null : { start: matched[index] as number, end: lineEndTime(matched, index) };
  }, [song, lrc, line]);

  useEffect(() => () => void runRef.current++, []);

  if (!song || !times) return null;

  const play = async () => {
    const run = ++runRef.current;
    if (playing) {
      setPlaying(false);
      try {
        await pauseSpotify();
      } catch {}
      return;
    }
    setPlaying(true);
    try {
      const now = await getSpotifyPlayback().catch(() => null);
      if (now && isSameTrack(song.songName, song.artistName ?? '', now.trackName, now.artists)) {
        await seekSpotify(times.start);
        if (!now.isPlaying) await resumeSpotify();
      } else {
        await playSongOnSpotify(song.songName, song.artistName ?? '', times.start);
      }
      const end = times.end ?? times.start + 8000;
      const giveUp = Date.now() + end - times.start + 10000;
      let fixes = 0;
      await sleep(800);
      while (runRef.current === run && Date.now() < giveUp) {
        const current = await getSpotifyPlayback().catch(() => null);
        if (!current || !isSameTrack(song.songName, song.artistName ?? '', current.trackName, current.artists) || !current.isPlaying) break;
        const progress = current.progressMs + (Date.now() - current.readAt);
        // Spotify sometimes starts the song from the top or ignores the seek: go to the line again
        if (progress < times.start - 1000 && fixes < 4) {
          fixes++;
          await seekSpotify(times.start);
          await sleep(700);
          continue;
        }
        if (progress >= end - 150) {
          await pauseSpotify();
          break;
        }
        await sleep(Math.min(500, Math.max(100, end - progress - 200)));
      }
    } catch (e) {
      ToastAndroid?.show?.(spotifyErrorMessage(e), ToastAndroid.SHORT);
    }
    if (runRef.current === run) setPlaying(false);
  };

  return (
    <TouchableOpacity hitSlop={6} style={style} onPress={() => void play()} accessibilityRole="button" accessibilityLabel={playing ? 'Stop playing this line' : 'Play this line'}>
      <Ionicons name={playing ? 'pause' : 'play'} size={size} color={Colors.primaryLight} />
    </TouchableOpacity>
  );
}
