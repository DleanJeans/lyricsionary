import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getSpotifyPlayback,
  pauseSpotify,
  playSongOnSpotify,
  resumeSpotify,
  seekSpotify,
  SpotifyError,
  spotifyErrorMessage,
  type SpotifyPlayback,
} from '../services/spotify';
import { getSyncedLyrics } from '../services/syncedLyrics';
import type { Song } from '../types';
import { isSameTrack, lineAtTime, matchSyncedLines, parseLrc, stepLine } from '../utils/syncedLyrics';

const POLL_MS = 1500;
const TICK_MS = 250;

export interface SpotifyLyricsSync {
  /** Spotify is playing this song */
  isThisSong: boolean;
  isPlaying: boolean;
  /** 'loading' until the synced lyrics are looked up, 'none' when LRCLIB has none */
  timings: 'loading' | 'none' | 'ready';
  /** When each line starts, null for lines without a time */
  times: (number | null)[];
  currentLine: number | null;
  error: string | null;
  seekToLine: (lineIndex: number) => Promise<void>;
  replayLine: () => Promise<void>;
  stepLine: (step: 1 | -1) => Promise<void>;
  togglePlay: () => Promise<void>;
}

/** Follows Spotify while it plays the song open in Learn, and seeks it by lyric line */
export function useSpotifyLyricsSync(song: Song | undefined, lines: string[], enabled: boolean): SpotifyLyricsSync {
  const focused = useIsFocused();
  const [playback, setPlayback] = useState<SpotifyPlayback | null>(null);
  const [lrc, setLrc] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const active = enabled && focused && !!song;

  const isThisSong = !!song && !!playback && isSameTrack(song.songName, song.artistName ?? '', playback.trackName, playback.artists);

  const refresh = useCallback(async () => {
    try {
      setPlayback(await getSpotifyPlayback());
      setError(null);
    } catch (e) {
      setError(spotifyErrorMessage(e));
      if (e instanceof SpotifyError && e.kind === 'signed-out') setPlayback(null);
    }
  }, []);

  // What Spotify plays, every couple of seconds while Learn is open
  useEffect(() => {
    if (!active) return;
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [active, refresh]);

  // The song's synced lyrics, looked up once Spotify's track gives its length, or right away
  const durationMs = isThisSong ? playback?.durationMs : undefined;
  const lookedUpRef = useRef<string | null>(null);
  useEffect(() => {
    if (!active || !song || lookedUpRef.current === song.id) return;
    lookedUpRef.current = song.id;
    setLrc(undefined);
    let cancelled = false;
    void getSyncedLyrics(song, durationMs).then((found) => {
      if (!cancelled) setLrc(found);
    });
    return () => {
      cancelled = true;
      lookedUpRef.current = null;
    };
    // durationMs only helps the first lookup
  }, [active, song?.id]);

  const times = useMemo(() => (lrc ? matchSyncedLines(lines, parseLrc(lrc)) : []), [lrc, lines]);

  // Moves the playing line along between polls
  useEffect(() => {
    if (!active || !playback?.isPlaying) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [active, playback?.isPlaying]);

  const progress = playback ? playback.progressMs + (playback.isPlaying ? Math.max(0, now - playback.readAt) : 0) : 0;
  const currentLine = isThisSong && times.length ? lineAtTime(times, progress) : null;

  const run = async (action: () => Promise<void>) => {
    try {
      await action();
      setError(null);
    } catch (e) {
      setError(spotifyErrorMessage(e));
    }
    // Spotify takes a moment to report the change
    setTimeout(() => void refresh(), 300);
  };

  const seekToLine = async (lineIndex: number) => {
    const time = times[lineIndex];
    if (time === null || time === undefined || !song) return;
    await run(async () => {
      if (isThisSong) {
        await seekSpotify(time);
        if (!playback?.isPlaying) await resumeSpotify();
      } else {
        await playSongOnSpotify(song.songName, song.artistName ?? '', time);
      }
      // Shows the line right away instead of after the next poll
      setPlayback((prev) => (prev ? { ...prev, progressMs: time, readAt: Date.now(), isPlaying: true } : prev));
    });
  };

  return {
    isThisSong,
    isPlaying: isThisSong && !!playback?.isPlaying,
    timings: lrc === undefined ? 'loading' : lrc && times.some((t) => t !== null) ? 'ready' : 'none',
    times,
    currentLine,
    error,
    seekToLine,
    replayLine: async () => {
      if (currentLine !== null) await seekToLine(currentLine);
    },
    stepLine: async (step) => {
      const from = currentLine ?? (step === 1 ? -1 : times.length);
      const target = stepLine(times, from, step);
      if (target !== null) await seekToLine(target);
    },
    togglePlay: () => run(() => (playback?.isPlaying ? pauseSpotify() : resumeSpotify())),
  };
}
