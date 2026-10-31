/** A line of synced lyrics (LRC) and when it starts */
export interface SyncedLine {
  timeMs: number;
  text: string;
}

/** The timed lines of LRC text like "[01:02.34] line", in time order; untimed and empty lines are left out */
export function parseLrc(lrc: string): SyncedLine[] {
  const lines: SyncedLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:[.:]\d+)?)\]/g)];
    if (stamps.length === 0) continue;
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    if (!text) continue;
    for (const stamp of stamps) {
      const seconds = parseFloat(stamp[2].replace(':', '.'));
      lines.push({ timeMs: Math.round((parseInt(stamp[1], 10) * 60 + seconds) * 1000), text });
    }
  }
  return lines.sort((a, b) => a.timeMs - b.timeMs);
}

const normalize = (text: string) =>
  text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** How alike two lines are, 0 to 1, by their words (or characters, for lines without spaces) */
export function lineSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const units = (text: string) => (text.includes(' ') ? text.split(' ') : [...text]);
  const ua = units(na);
  const ub = units(nb);
  const counts = new Map<string, number>();
  for (const u of ua) counts.set(u, (counts.get(u) ?? 0) + 1);
  let shared = 0;
  for (const u of ub) {
    const left = counts.get(u) ?? 0;
    if (left > 0) {
      shared++;
      counts.set(u, left - 1);
    }
  }
  return (2 * shared) / (ua.length + ub.length);
}

const MIN_SIMILARITY = 0.5;

/**
 * When each of the song's lines starts, by lining the song up with the synced lines in order, so a
 * repeated chorus gets each of its times. Lines with no match, like blank ones, get null.
 */
export function matchSyncedLines(songLines: string[], synced: SyncedLine[]): (number | null)[] {
  const n = songLines.length;
  const m = synced.length;
  // score[i][j]: the best total similarity lining up the first i song lines with the first j synced lines
  const score: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  const sims: number[][] = Array.from({ length: n }, (_, i) =>
    synced.map((line) => (songLines[i].trim() ? lineSimilarity(songLines[i], line.text) : 0))
  );
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sim = sims[i - 1][j - 1];
      score[i][j] = Math.max(
        score[i - 1][j],
        score[i][j - 1],
        sim >= MIN_SIMILARITY ? score[i - 1][j - 1] + sim : -Infinity
      );
    }
  }
  const times: (number | null)[] = new Array(n).fill(null);
  for (let i = n, j = m; i > 0 && j > 0; ) {
    const sim = sims[i - 1][j - 1];
    if (sim >= MIN_SIMILARITY && score[i][j] === score[i - 1][j - 1] + sim) {
      times[i - 1] = synced[j - 1].timeMs;
      i--;
      j--;
    } else if (score[i][j] === score[i - 1][j]) {
      i--;
    } else {
      j--;
    }
  }
  return times;
}

/** The song line playing at the time: the last one started, or null before the first */
export function lineAtTime(times: (number | null)[], progressMs: number): number | null {
  let best: number | null = null;
  let bestTime = -1;
  times.forEach((time, index) => {
    if (time !== null && time <= progressMs && time >= bestTime) {
      best = index;
      bestTime = time;
    }
  });
  return best;
}

/** The next or previous timed line from a line, skipping lines with no time */
export function stepLine(times: (number | null)[], from: number, step: 1 | -1): number | null {
  for (let i = from + step; i >= 0 && i < times.length; i += step) if (times[i] !== null) return i;
  return null;
}

/** Whether Spotify's track is the song, by title and artist, loosely */
export function isSameTrack(songName: string, artistName: string, trackName: string, trackArtists: string): boolean {
  const title = (text: string) => normalize(text.replace(/\s*[([].*?[)\]]\s*/g, ' ').replace(/\s+-\s+.*$/, ''));
  const a = title(songName);
  const b = title(trackName);
  if (!a || !b || !(a === b || a.includes(b) || b.includes(a))) return false;
  const artist = normalize(artistName);
  return !artist || normalize(trackArtists).includes(artist) || artist.includes(normalize(trackArtists));
}
