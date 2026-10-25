// Guesses a song's sections (verse, chorus, bridge...) from which parts of the lyrics repeat.
// Genius section tags are stripped when lyrics are scraped, so this only has the lines and
// the blank lines between stanzas to go on.

export type SectionKind = 'intro' | 'verse' | 'pre-chorus' | 'chorus' | 'bridge' | 'hook' | 'outro';

export interface SongSection {
  kind: SectionKind;
  label: string;
  start: number; // First line index
  end: number; // Last line index, inclusive
}

const SECTION_NAMES: Record<SectionKind, string> = {
  intro: 'Intro',
  verse: 'Verse',
  'pre-chorus': 'Pre-Chorus',
  chorus: 'Chorus',
  bridge: 'Bridge',
  hook: 'Hook',
  outro: 'Outro',
};

const normalizeLine = (line: string) =>
  line
    .toLowerCase()
    .replace(/\(\s*x\s*\d+\s*\)|\bx\d+\b/g, '') // Repeat markers like (x2)
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

interface Segment {
  start: number;
  end: number;
  lines: string[]; // Normalized
}

/** Splits the lyrics into stanzas at blank lines, then splits each stanza where its repeated lines begin or end. */
function splitSegments(norm: string[]): Segment[] {
  // A line counts as repeated when it starts or ends a pair of consecutive lines found elsewhere too
  const pairCounts = new Map<string, number>();
  const pairKey = (i: number) => (norm[i] && norm[i + 1] ? `${norm[i]}\n${norm[i + 1]}` : null);
  norm.forEach((_, i) => {
    const key = pairKey(i);
    if (key) pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  });
  const isRepeatedPair = (i: number) => {
    const key = i >= 0 ? pairKey(i) : null;
    return key !== null && (pairCounts.get(key) ?? 0) > 1;
  };
  const repeated = norm.map((_, i) => isRepeatedPair(i - 1) || isRepeatedPair(i));

  const segments: Segment[] = [];
  let i = 0;
  while (i < norm.length) {
    if (!norm[i]) {
      i++;
      continue;
    }
    let end = i;
    while (end + 1 < norm.length && norm[end + 1]) end++;

    // Split the stanza into runs of repeated / not repeated lines, folding one-line runs into a neighbor
    const runs: { start: number; end: number }[] = [];
    for (let j = i; j <= end; j++) {
      const last = runs[runs.length - 1];
      if (last && repeated[j] === repeated[last.end]) last.end = j;
      else runs.push({ start: j, end: j });
    }
    for (let r = 0; r < runs.length && runs.length > 1; ) {
      if (runs[r].end > runs[r].start) {
        r++;
        continue;
      }
      if (r > 0) runs[r - 1].end = runs[r].end;
      else runs[1].start = runs[0].start;
      runs.splice(r, 1);
    }
    runs.forEach((run) => segments.push({ ...run, lines: norm.slice(run.start, run.end + 1) }));
    i = end + 1;
  }
  return segments;
}

function longestCommonSubsequence(a: string[], b: string[]): number {
  let prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const row = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      row[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], row[j - 1]);
    }
    prev = row;
  }
  return prev[b.length];
}

/** Whether two segments are the same part of the song, allowing a changed line or a doubled chorus. */
function isSamePart(a: string[], b: string[]): boolean {
  const common = longestCommonSubsequence(a, b);
  const shorter = Math.min(a.length, b.length);
  const longer = Math.max(a.length, b.length);
  if (common / longer >= 0.6) return true;
  return common >= 2 && common / shorter >= 0.75 && shorter / longer >= 0.4;
}

export function detectSongSections(lyricsLines: string[]): SongSection[] {
  const segments = splitSegments(lyricsLines.map(normalizeLine));
  if (segments.length < 2) return [];

  // Group the segments that are the same part of the song
  const clusterOf: number[] = [];
  const clusters: number[][] = [];
  segments.forEach((segment, s) => {
    const c = clusters.findIndex((members) => members.some((m) => isSamePart(segments[m].lines, segment.lines)));
    if (c >= 0) {
      clusters[c].push(s);
      clusterOf.push(c);
    } else {
      clusters.push([s]);
      clusterOf.push(clusters.length - 1);
    }
  });
  const isRepeated = (c: number) => clusters[c].length > 1;
  const lineCount = (c: number) => clusters[c].reduce((sum, s) => sum + segments[s].lines.length, 0);
  const followedBy = (c: number, target: number) =>
    clusters[c].filter((s) => clusterOf[s + 1] === target).length;

  // The chorus is the part that takes up the most lines through its repeats
  let chorus = -1;
  clusters.forEach((_, c) => {
    if (isRepeated(c) && (chorus < 0 || lineCount(c) > lineCount(chorus))) chorus = c;
  });

  const kindOf = new Map<number, SectionKind>();
  clusters.forEach((members, c) => {
    if (c === chorus) kindOf.set(c, 'chorus');
    else if (!isRepeated(c)) return;
    else if (chorus >= 0 && followedBy(c, chorus) * 2 >= members.length) kindOf.set(c, 'pre-chorus');
    else if (lineCount(c) / members.length <= 2) kindOf.set(c, 'hook');
    else if (chorus >= 0 && members.filter((s) => clusterOf[s - 1] === chorus).length * 2 >= members.length) {
      kindOf.set(c, 'hook'); // Follows the chorus, like a post-chorus
    } else kindOf.set(c, 'verse');
  });

  const lengths = segments.map((segment) => segment.lines.length).sort((a, b) => a - b);
  const median = lengths[Math.floor(lengths.length / 2)];
  const isShort = (s: number) => segments[s].lines.length <= Math.max(2, median * 0.6);
  const chorusStarts = chorus >= 0 ? clusters[chorus] : [];

  const sectionKind = (s: number): SectionKind => {
    const known = kindOf.get(clusterOf[s]);
    if (known) return known;
    const last = segments.length - 1;
    if (s === 0 && segments.length >= 3 && isShort(s)) return 'intro';
    if (s === last && segments.length >= 3 && (chorusStarts.some((c) => c < s) || isShort(s))) return 'outro';
    const chorusesBefore = chorusStarts.filter((c) => c < s).length;
    if (chorusesBefore >= 2 && chorusStarts.some((c) => c > s)) return 'bridge';
    // A part made of one line sung over and over
    const lines = segments[s].lines;
    if (lines.length >= 3 && new Set(lines).size * 2 <= lines.length) return 'hook';
    return 'verse';
  };

  // Number the verses when there is more than one, keeping a repeated verse's number
  const kinds = segments.map((_, s) => sectionKind(s));
  const verseNumbers = new Map<number, number>();
  kinds.forEach((kind, s) => {
    if (kind === 'verse' && !verseNumbers.has(clusterOf[s])) verseNumbers.set(clusterOf[s], verseNumbers.size + 1);
  });

  return segments.map((segment, s) => {
    const kind = kinds[s];
    const label = kind === 'verse' && verseNumbers.size > 1
      ? `${SECTION_NAMES.verse} ${verseNumbers.get(clusterOf[s])}`
      : SECTION_NAMES[kind];
    return { kind, label, start: segment.start, end: segment.end };
  });
}

/** The lyrics as text with a [Section] tag above each detected section, for checking the detection. */
export function formatSongSections(lyricsLines: string[]): string {
  return detectSongSections(lyricsLines)
    .map((section) => `[${section.label}]\n${lyricsLines.slice(section.start, section.end + 1).join('\n')}`)
    .join('\n\n');
}
