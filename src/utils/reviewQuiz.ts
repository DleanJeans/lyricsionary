import { languageKey } from '../constants/languages';
import type { Song, WordContext, WordEntry } from '../types';
import { removeSpecialChars } from './cleanLyrics';
import { isCjkWord } from './cjkWords';
import { lineTranslation } from './wordOfTheDay';
import { firstIpa } from './ipaList';
import { buildLyricQuiz, buildMeaningQuiz, isDue, isTricky, Quiz, QuizKind, quizKindFor, type QuizTarget } from './wordQuiz';

export interface ReviewItem {
  entry: WordEntry;
  kind: QuizKind;
  quiz: Quiz;
  /** The lyric line the word was saved from, if it has one */
  line?: string;
  /** Where the word is in the line, to bold it or blank it out */
  wordAt?: { start: number; end: number };
  /** The line's translation, or the word's meaning when the line has none, to fill the gap from */
  hint?: string;
  /** Asked from the word's recording instead of its line: "Which word did you hear?" */
  listen?: boolean;
  /**
   * Asked from the word's IPA alone, with no line, translation or meaning shown: a lyric quiz has the
   * word typed from it (spelling), a meaning quiz picks the word's meaning
   */
  ipa?: string;
  /** How the word is asked (reviewWays) */
  way?: ReviewWay;
  /** What the quiz was built from, to build it again when it's shown (rebuildReviewQuiz) */
  target?: QuizTarget;
  /**
   * The line is from another song the word is in but wasn't saved from (otherSongLines), so it has
   * no saved context: the session shows that song and its translation of the line, and offers to save it
   */
  unsaved?: { songId: string; songName: string; artistName?: string; translation?: string; definition: string; partOfSpeech?: WordContext['partOfSpeech'] };
}

/** What the review reads from a song: its lyrics to find a word's other lines in, and its name */
export type ReviewSong = Pick<Song, 'id'> &
  Partial<Pick<Song, 'songName' | 'artistName' | 'originalLyrics' | 'originalLanguages' | 'translations' | 'archivedAt' | 'lastOpenedAt'>>;

/** The line's words, also split at apostrophes, e.g. amour in l'amour */
export const lineWords = (line: string) =>
  line.split(/[\s'’]+/).map(removeSpecialChars).filter(Boolean);

const isLetter = (char: string | undefined) => !!char && /[\p{L}\p{N}]/u.test(char);

/** Where the word is in the line, ignoring case, as a whole word unless it's written without spaces */
export function findWordInLine(line: string, word: string): { start: number; end: number } | null {
  const lowerLine = line.toLowerCase();
  const lowerWord = word.toLowerCase();
  const wholeWord = !isCjkWord(word);
  for (let start = lowerLine.indexOf(lowerWord); start !== -1; start = lowerLine.indexOf(lowerWord, start + 1)) {
    const end = start + lowerWord.length;
    if (!wholeWord || (!isLetter(line[start - 1]) && !isLetter(line[end]))) return { start, end };
  }
  return null;
}

interface IndexedLine {
  song: ReviewSong;
  line: string;
}

// Each language's song lines by the words in them, built once for each list of songs (the store
// makes a new list when a song changes), so finding a word's lines doesn't read every song's lyrics
const lineIndexes = new WeakMap<object, Map<string, Map<string, IndexedLine[]>>>();

function lineIndex(songs: ReviewSong[]): Map<string, Map<string, IndexedLine[]>> {
  const kept = lineIndexes.get(songs);
  if (kept) return kept;
  const index = new Map<string, Map<string, IndexedLine[]>>();
  for (const song of songs) {
    const language = song.originalLanguages?.[0];
    if (song.archivedAt || !language || !song.originalLyrics) continue;
    const key = languageKey(language);
    let byWord = index.get(key);
    if (!byWord) index.set(key, (byWord = new Map()));
    const lines = new Set(song.originalLyrics.split('\n').map((l) => l.trim()).filter(Boolean));
    for (const line of lines) {
      for (const token of new Set(lineWords(line).map((w) => w.toLowerCase()))) {
        let list = byWord.get(token);
        if (!list) byWord.set(token, (list = []));
        list.push({ song, line });
      }
    }
  }
  lineIndexes.set(songs, index);
  return index;
}

/**
 * The word's lines in songs of its language it wasn't saved from, one line per lyric (a line two
 * songs share comes once). Archived songs are skipped. Words written without spaces aren't looked for,
 * as their lines can't be split into words.
 */
export function otherSongLines(entry: WordEntry, songs: ReviewSong[]): IndexedLine[] {
  if (!songs.length || !entry.language || isCjkWord(entry.word)) return [];
  const first = lineWords(entry.word)[0]?.toLowerCase();
  if (!first) return [];
  const savedSongs = new Set((entry.contexts ?? []).map((c) => c.songId).filter(Boolean));
  const savedLines = new Set((entry.contexts ?? []).map((c) => c.context?.trim().toLowerCase()).filter(Boolean));
  const found: IndexedLine[] = [];
  for (const spot of lineIndex(songs).get(languageKey(entry.language))?.get(first) ?? []) {
    const lower = spot.line.toLowerCase();
    if (savedSongs.has(spot.song.id) || savedLines.has(lower) || !findWordInLine(spot.line, entry.word)) continue;
    savedLines.add(lower);
    found.push(spot);
  }
  return found;
}

/**
 * How common the word is in the songs: the distinct sentences it's in and the songs they're from.
 * A sentence sung again (a chorus) counts once, however many times or in how many songs it comes,
 * matched by its text ignoring case and punctuation. The lines it was saved from count too.
 */
export interface WordSentence {
  line: string;
  /** The songs the sentence is sung in; the first is shown */
  songs: { id: string; name: string; artist?: string; song?: ReviewSong; translation?: string }[];
}

/** The distinct sentences the word is in (see wordFrequency), each with the songs it's in */
export function wordSentences(entry: Pick<WordEntry, 'word' | 'language' | 'contexts'>, songs: ReviewSong[]): WordSentence[] {
  const key = (line: string) => lineWords(line).join(' ').toLowerCase();
  const found = new Map<string, WordSentence>();
  const add = (line: string, id: string, name: string, song?: ReviewSong, artist?: string, saved?: string) => {
    const k = key(line);
    let sentence = found.get(k);
    if (!sentence) found.set(k, (sentence = { line, songs: [] }));
    if (id && sentence.songs.some((x) => x.id === id)) return;
    const translation = saved?.trim() || (song?.originalLyrics && song.translations ? lineTranslation(song as Song, line) ?? undefined : undefined);
    sentence.songs.push({ id, name, artist: artist ?? song?.artistName, song, translation });
  };
  for (const context of entry.contexts ?? []) {
    if (context.context?.trim() && findWordInLine(context.context, entry.word)) {
      const song = context.songId ? songs.find((x) => x.id === context.songId) : undefined;
      add(context.context.trim(), context.songId ?? '', song?.songName || context.songName || 'Untitled', song, undefined, context.translation);
    }
  }
  const first = entry.language && !isCjkWord(entry.word) ? lineWords(entry.word)[0]?.toLowerCase() : undefined;
  if (first && songs.length) {
    for (const spot of lineIndex(songs).get(languageKey(entry.language))?.get(first) ?? []) {
      if (findWordInLine(spot.line, entry.word)) add(spot.line, spot.song.id, spot.song.songName || 'Untitled', spot.song);
    }
  }
  return [...found.values()];
}

export function wordFrequency(entry: WordEntry, songs: ReviewSong[]): { lines: number; songs: number } {
  const sentences = wordSentences(entry, songs);
  return { lines: sentences.length, songs: new Set(sentences.flatMap((x) => x.songs.map((y) => y.id).filter(Boolean))).size };
}

/** Words in more distinct sentences and songs rank higher; steps of doubling, so waiting longest still breaks ties */
export function frequencyTier(entry: WordEntry, songs: ReviewSong[]): number {
  const { lines, songs: n } = wordFrequency(entry, songs);
  return Math.floor(Math.log2(1 + lines + 2 * n));
}

/** One of the items, picked at random; no random number is taken when there's only one */
const pickOne = <T,>(items: T[], random: () => number): T =>
  items.length === 1 ? items[0] : items[Math.min(items.length - 1, Math.floor(random() * items.length))];

/**
 * The line to ask the word from: a song picked at random among the ones it has a line in, saved or
 * not, then one of its lines, so the same line doesn't come up every time
 */
function pickLine(
  entry: WordEntry,
  songs: ReviewSong[],
  random: () => number
): { context: WordContext; song?: undefined } | { context?: undefined; song: ReviewSong; line: string } | null {
  const bySong = new Map<string, ({ context: WordContext } | { song: ReviewSong; line: string })[]>();
  const add = (key: string, choice: { context: WordContext } | { song: ReviewSong; line: string }) => {
    const list = bySong.get(key);
    if (list) list.push(choice);
    else bySong.set(key, [choice]);
  };
  (entry.contexts ?? []).forEach((context, i) => {
    if (context.definition?.trim() && context.context?.trim() && findWordInLine(context.context, entry.word)) {
      add(context.songId ?? `context ${i}`, { context });
    }
  });
  for (const spot of otherSongLines(entry, songs)) add(spot.song.id, spot);
  if (!bySong.size) return null;
  const choice = pickOne(pickOne([...bySong.values()], random), random);
  return 'context' in choice ? { context: choice.context } : { song: choice.song, line: choice.line };
}

// The context to ask about: the first with a lyric line and a meaning, otherwise the first with a meaning
const pickContext = (entry: WordEntry): WordContext | undefined => {
  const contexts = entry.contexts ?? [];
  return (
    contexts.find((c) => c.definition?.trim() && c.context?.trim() && findWordInLine(c.context, entry.word)) ??
    contexts.find((c) => c.definition?.trim())
  );
};

// The meaning a word's quiz asks for, from the context it's asked about
const answerFor = (entry: WordEntry, context: WordContext | undefined) =>
  context?.definition?.trim() || entry.definitions?.find((d) => d.text.trim())?.text.trim();

/**
 * The IPA the word is asked from, without slashes or brackets: the word's own, since a merged form's
 * line has the form's, else the asked context's
 */
export const reviewIpa = (entry: WordEntry, context: WordContext | undefined): string | undefined =>
  firstIpa(entry.pronunciation || context?.ipa).replace(/[/[\]]/g, '').trim() || undefined;

/**
 * The ways a quiz can ask a word. A meaning quiz: from the word itself ('meaning'), its IPA alone
 * ('meaning-ipa') or its recording ('meaning-listen'). A lyric quiz: from the line's gap, or the
 * meaning when the line lacks the word ('lyric'), its recording ('lyric-listen') or typed from its
 * IPA alone ('lyric-ipa').
 */
export type ReviewWay = 'meaning' | 'meaning-ipa' | 'meaning-listen' | 'lyric' | 'lyric-listen' | 'lyric-ipa';

/**
 * The ways a word can be asked: IPA ones need its IPA, listening ones a recording, and the others a
 * quiz with options. A lyric quiz whose line lacks the word is always heard when it can be.
 */
export function reviewWays(
  kind: QuizKind,
  has: { hasQuiz: boolean; hasLine: boolean; hasAudio: boolean; hasIpa: boolean }
): ReviewWay[] {
  const ways: ReviewWay[] = [];
  const listenOnly = kind === 'lyric' && !has.hasLine && has.hasAudio;
  if (has.hasQuiz && !listenOnly) ways.push(kind);
  if (has.hasQuiz && has.hasAudio) ways.push(`${kind}-listen`);
  if (has.hasIpa && (has.hasQuiz || kind === 'lyric')) ways.push(`${kind}-ipa`);
  return ways;
}

const buildQuiz = (kind: QuizKind, target: QuizTarget, words: WordEntry[], random: () => number, now: number) =>
  kind === 'meaning' ? buildMeaningQuiz(target, words, random, now) : buildLyricQuiz(target, words, random, now);

/**
 * The item's quiz built again from the saved words as they are now, for when it's shown: a session's
 * quizzes are built when it starts, so a word answered right earlier in the session would still be
 * another quiz's wrong option. Keeps the quiz it has if a new one can't be made.
 */
export function rebuildReviewQuiz(item: ReviewItem, words: WordEntry[], random = Math.random, now = Date.now()): Quiz {
  if (!item.target) return item.quiz;
  return buildQuiz(item.kind, { ...item.target, entry: words.find((w) => w.id === item.entry.id) ?? item.entry }, words, random, now) ?? item.quiz;
}

/**
 * Whether a due word can be reviewed: its level has a quiz and it has a meaning to ask for. Cheap,
 * for counting a song's due words without building their quizzes, which compare every saved word.
 */
export const canReview = (entry: WordEntry) => !!quizKindFor(entry.masteryLevel) && !!answerFor(entry, pickContext(entry));

/**
 * A quiz for each word that's due (isDue), tricky ones (isTricky) first, then the ones in more
 * distinct sentences and songs (frequencyTier), then the ones not quizzed for longest. Each word is asked the way asked least so far among the ones it has (reviewWays), so
 * every way comes up about as often; `counts` keeps how often each was. A word whose quiz can't be
 * made, e.g. one with no meaning or too few other saved words in its language, is left out.
 */
export function buildReviewItems(
  dueWords: WordEntry[],
  words: WordEntry[],
  random = Math.random,
  counts: Map<ReviewWay, number> = new Map(),
  songs: ReviewSong[] = []
): ReviewItem[] {
  const items: ReviewItem[] = [];
  // Tricky words first, then the ones not quizzed for longest
  const now = Date.now();
  const tier = new Map(dueWords.map((w) => [w.id, frequencyTier(w, songs)]));
  const ordered = [...dueWords].sort(
    (a, b) =>
      Number(isTricky(b.quiz, now)) - Number(isTricky(a.quiz, now)) ||
      tier.get(b.id)! - tier.get(a.id)! ||
      (a.quiz?.lastAnsweredAt ?? 0) - (b.quiz?.lastAnsweredAt ?? 0)
  );
  for (const entry of ordered) {
    const kind = quizKindFor(entry.masteryLevel);
    if (!kind) continue;
    // The line is one of the word's saved ones or another song's it wasn't saved from; that one asks
    // for the meaning saved first
    const picked = pickLine(entry, songs, random);
    const context = picked?.context ?? pickContext(entry);
    const answer = answerFor(entry, context);
    if (!answer) continue;
    const other = picked?.song;
    const line = (other ? picked.line : context?.context?.trim()) || undefined;
    const wordAt = line ? findWordInLine(line, entry.word) ?? undefined : undefined;
    const target: QuizTarget = {
      entry,
      answer,
      partOfSpeech: context?.partOfSpeech,
      songId: other ? other.id : context?.songId,
      // Words the line shows can't be what's missing from it
      excludeWords:
        kind === 'lyric' && wordAt && line ? [...line.split(/\s+/).map(removeSpecialChars), ...lineWords(line)] : undefined,
    };
    // How the word is asked, balanced over the session: the way asked least so far among the ones
    // the word has (reviewWays)
    const ipaText = reviewIpa(entry, context);
    const built = buildQuiz(kind, target, words, random, now);
    const ways = reviewWays(kind, { hasQuiz: !!built, hasLine: !!wordAt, hasAudio: !!entry.audio?.length, hasIpa: !!ipaText });
    if (!ways.length) continue;
    const fewest = Math.min(...ways.map((w) => counts.get(w) ?? 0));
    const least = ways.filter((w) => (counts.get(w) ?? 0) === fewest);
    const way = least[Math.min(least.length - 1, Math.floor(random() * least.length))];
    counts.set(way, fewest + 1);
    const ipa = way.endsWith('ipa') ? ipaText : undefined;
    const listen = way.endsWith('listen');
    // Spelling is typed, so it needs no options, but other words make it one when there are enough
    const quiz = built ?? { options: [entry.word], answerIndex: 0 };
    const otherTranslation =
      other && line && other.originalLyrics && other.translations ? lineTranslation(other as Song, line) ?? undefined : undefined;
    items.push({
      way,
      listen,
      ipa,
      entry,
      kind,
      quiz,
      line,
      wordAt,
      hint: kind === 'lyric' ? (wordAt && (other ? otherTranslation : context?.translation?.trim())) || answer : undefined,
      target,
      unsaved: other
        ? {
            songId: other.id,
            songName: other.songName || 'Untitled',
            artistName: other.artistName || undefined,
            translation: otherTranslation,
            definition: answer,
            partOfSpeech: context?.partOfSpeech,
          }
        : undefined,
    });
  }
  return items;
}

export const dueWords = (words: WordEntry[], now: number) => words.filter((w) => isDue(w, now));

/** Review session sizes to pick from when more words are due than the smallest */
export const REVIEW_SIZES = [10, 20];

/**
 * The words for a session of `size`: the ones waiting longest (buildReviewItems' order), shuffled
 * so one language's words don't all come in a row
 */
export function pickReviewItems(items: ReviewItem[], size: number, random = Math.random): ReviewItem[] {
  const picked = items.slice(0, size);
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return picked;
}

/** How many words the review shown when the app opens asks */
export const LAUNCH_REVIEW_SIZE = 10;

/** Songs opened within this long count as recent for the launch review */
export const RECENT_SONG_MS = 7 * 24 * 60 * 60 * 1000;
/** After a longer absence, this many songs opened before it count as recent */
export const RECENT_SONGS_AFTER_ABSENCE = 3;

/**
 * The review to show when the app opens: due words from the songs opened in the last 7 days,
 * taken from each in turn so one song doesn't fill the review. If the last song was opened longer
 * ago than that (the user was away), the 3 songs opened last count as recent instead. What is
 * left over is topped up from older songs, most recent first. Archived songs are skipped. Each
 * song's words keep buildReviewItems' order, tricky ones and the ones waiting longest first; the
 * session shuffles them.
 */
export function buildLaunchReview(
  songs: ReviewSong[],
  words: WordEntry[],
  now = Date.now(),
  size = LAUNCH_REVIEW_SIZE,
  random = Math.random
): ReviewItem[] {
  const due = dueWords(words, now).filter(canReview);
  if (!due.length) return [];
  const sorted = songs.filter((s) => !s.archivedAt).sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0));
  let recentCount = sorted.filter((s) => now - (s.lastOpenedAt ?? 0) <= RECENT_SONG_MS).length;
  if (!recentCount) recentCount = RECENT_SONGS_AFTER_ABSENCE;
  const groups = [sorted.slice(0, recentCount), sorted.slice(recentCount)];
  const picked: ReviewItem[] = [];
  const taken = new Set<string>();
  // The ways words are asked are balanced over the whole review, not each song's part
  const counts = new Map<ReviewWay, number>();
  const queueFor = (song: { id: string }) => {
    const songDue = due.filter((w) => w.contexts?.some((c) => c.songId === song.id));
    return songDue.length ? buildReviewItems(songDue, words, random, new Map(counts), songs) : [];
  };
  const take = (item: ReviewItem) => {
    if (taken.has(item.entry.id)) return false;
    picked.push(item);
    if (item.way) counts.set(item.way, (counts.get(item.way) ?? 0) + 1);
    taken.add(item.entry.id);
    return true;
  };
  // Recent songs share the review a word at a time; older ones fill what is left one song at a time
  const recentQueues = groups[0].map(queueFor);
  for (let round = 0; picked.length < size && recentQueues.some((q) => q.length); round++) {
    for (const queue of recentQueues) {
      while (queue.length && picked.length < size && !take(queue.shift()!));
    }
  }
  for (const song of groups[1]) {
    if (picked.length >= size) break;
    for (const item of queueFor(song)) {
      if (picked.length >= size) break;
      take(item);
    }
  }
  return picked;
}
