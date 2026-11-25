import AsyncStorage from '@react-native-async-storage/async-storage';
import { languageKey } from '../constants/languages';
import type { MasteryLevel, Song, WordContext, WordEntry } from '../types';
import { removeSpecialChars } from './cleanLyrics';
import { isCjkWord } from './cjkWords';
import { contextTranslation, lineTranslation } from './wordOfTheDay';
import { hasSpeechModule } from '../services/speechRecognition';
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
  /** Asked by saying the word out loud, which the speech recognizer checks */
  speak?: boolean;
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

/**
 * A short piece stuck to the end of the word before it with an apostrophe, like the n of Frau'n or
 * the s of geht's, so it isn't a word on its own (unlike amour in l'amour, whose apostrophe follows the piece)
 */
function isClippedFragment(line: string, start: number, end: number): boolean {
  if (end - start > 2 || !/['’]/.test(line[start - 1] ?? '')) return false;
  let before = start - 1;
  while (before > 0 && isLetter(line[before - 1])) before--;
  return start - 1 - before >= 3;
}

/** Where the word is in the line, ignoring case, as a whole word unless it's written without spaces */
export function findWordInLine(line: string, word: string): { start: number; end: number } | null {
  const lowerLine = line.toLowerCase();
  const lowerWord = word.toLowerCase();
  const wholeWord = !isCjkWord(word);
  for (let start = lowerLine.indexOf(lowerWord); start !== -1; start = lowerLine.indexOf(lowerWord, start + 1)) {
    const end = start + lowerWord.length;
    if (!wholeWord || (!isLetter(line[start - 1]) && !isLetter(line[end]) && !isClippedFragment(line, start, end))) return { start, end };
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
    const translation = contextTranslation(song as Song | undefined, line, saved);
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
): { context: WordContext; song?: undefined } | { context?: undefined; song: ReviewSong; line: string; match: WordContext } | null {
  type Choice = { context: WordContext } | { song: ReviewSong; line: string; match: WordContext };
  const bySong = new Map<string, Choice[]>();
  const add = (key: string, choice: Choice) => {
    const list = bySong.get(key);
    if (list) list.push(choice);
    else bySong.set(key, [choice]);
  };
  (entry.contexts ?? []).forEach((context, i) => {
    if (context.definition?.trim() && context.context?.trim() && findWordInLine(context.context, entry.word)) {
      add(context.songId ?? `context ${i}`, { context });
    }
  });
  // Another song's line is asked only when its translation shows one of a saved meaning (nach meaning
  // "past" in a line about smelling smoke, or da "there" when the saved meaning is "all that", isn't a
  // match); a line with no translation can't be checked, so it isn't asked. That meaning's context
  // is the one asked about.
  const meaningsOf = (c: WordContext) =>
    (c.definition ?? '')
      .toLowerCase()
      .split(/[,;/()]+/)
      .map((m) => m.replace(/^\s*(to|a|an|the)\s+/, '').trim())
      .filter((m) => m.length > 1);
  const fits = (song: ReviewSong, line: string): WordContext | undefined => {
    const translation = song.originalLyrics && song.translations ? lineTranslation(song as Song, line) : null;
    if (!translation) return undefined;
    const lower = translation.toLowerCase();
    return (entry.contexts ?? []).find((c) => meaningsOf(c).some((m) => lower.includes(m)));
  };
  for (const spot of otherSongLines(entry, songs)) {
    const match = fits(spot.song, spot.line);
    if (match) add(spot.song.id, { ...spot, match });
  }
  if (!bySong.size) return null;
  const choice = pickOne(pickOne([...bySong.values()], random), random);
  return 'context' in choice ? { context: choice.context } : { song: choice.song, line: choice.line, match: choice.match };
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
 * IPA alone ('lyric-ipa'). Either can also be said out loud ('speak') where the device can recognize speech.
 */
const SPEAK_PAUSE_KEY = '@lyricsionary_speak_paused_until';
const SPEAK_PAUSE_MS = 5 * 60 * 1000;
let speakPausedUntil = 0;
AsyncStorage.getItem(SPEAK_PAUSE_KEY)
  .then((v) => {
    const t = Number(v);
    if (t > speakPausedUntil) speakPausedUntil = t;
  })
  .catch(() => {});

/** Stop asking speaking quizzes for 10 minutes, e.g. after "Can't use the mic?" is tapped. */
export function pauseSpeakingQuizzes(): void {
  speakPausedUntil = Date.now() + SPEAK_PAUSE_MS;
  AsyncStorage.setItem(SPEAK_PAUSE_KEY, String(speakPausedUntil)).catch(() => {});
}

export const speakingPaused = () => Date.now() < speakPausedUntil;

export type ReviewWay = 'meaning' | 'meaning-ipa' | 'meaning-listen' | 'lyric' | 'lyric-listen' | 'lyric-ipa' | 'speak';

/**
 * The ways a word can be asked: IPA ones need its IPA, listening ones a recording, and the others a
 * quiz with options. A lyric quiz whose line lacks the word is always heard when it can be.
 */
export function reviewWays(
  kind: QuizKind,
  has: { hasQuiz: boolean; hasLine: boolean; hasAudio: boolean; hasIpa: boolean; canSpeak?: boolean }
): ReviewWay[] {
  const ways: ReviewWay[] = [];
  const listenOnly = kind === 'lyric' && !has.hasLine && has.hasAudio;
  if (has.hasQuiz && !listenOnly) ways.push(kind);
  if (has.hasQuiz && has.hasAudio) ways.push(`${kind}-listen`);
  if (has.hasIpa && (has.hasQuiz || kind === 'lyric')) ways.push(`${kind}-ipa`);
  if (has.canSpeak) ways.push('speak');
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

/** Due words in the order they're asked: tricky ones first, then the ones not quizzed for longest */
export function orderDueWords(dueWords: WordEntry[], songs: ReviewSong[] = []): WordEntry[] {
  const now = Date.now();
  const tier = new Map(dueWords.map((w) => [w.id, frequencyTier(w, songs)]));
  return [...dueWords].sort(
    (a, b) =>
      Number(isTricky(b.quiz, now)) - Number(isTricky(a.quiz, now)) ||
      tier.get(b.id)! - tier.get(a.id)! ||
      (a.quiz?.lastAnsweredAt ?? 0) - (b.quiz?.lastAnsweredAt ?? 0)
  );
}

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
  songs: ReviewSong[] = [],
  force?: { way: ReviewWay; kind: QuizKind; needsLine?: boolean }
): ReviewItem[] {
  const items: ReviewItem[] = [];
  const now = Date.now();
  const ordered = orderDueWords(dueWords, songs);
  for (const entry of ordered) {
    const kind = force?.kind ?? quizKindFor(entry.masteryLevel);
    if (!kind) continue;
    // The line is one of the word's saved ones or another song's it wasn't saved from; that one asks
    // for the meaning saved first
    const picked = pickLine(entry, songs, random);
    const context = picked?.context ?? picked?.match ?? pickContext(entry);
    const answer = answerFor(entry, context);
    if (!answer) continue;
    const other = picked?.song;
    let line = (other ? picked.line : context?.context?.trim()) || undefined;
    const wordAt = line ? findWordInLine(line, entry.word) ?? undefined : undefined;
    // A clipped piece like the n of Frau'n isn't in its line as a word, so the line isn't shown for it
    if (line && !wordAt && lineWords(entry.word).join('').length <= 2) line = undefined;
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
    const ways = reviewWays(kind, { hasQuiz: !!built, hasLine: !!wordAt, hasAudio: !!entry.audio?.length, hasIpa: !!ipaText, canSpeak: hasSpeechModule() && !!built && !speakingPaused() });
    if (!ways.length) continue;
    if (force && (!ways.includes(force.way) || (force.needsLine && !wordAt))) continue;
    const fewest = Math.min(...ways.map((w) => counts.get(w) ?? 0));
    const least = ways.filter((w) => (counts.get(w) ?? 0) === fewest);
    const way = force ? force.way : least[Math.min(least.length - 1, Math.floor(random() * least.length))];
    counts.set(way, fewest + 1);
    const ipa = way.endsWith('ipa') ? ipaText : undefined;
    const speak = way === 'speak';
    const listen = way.endsWith('listen');
    // Spelling is typed, so it needs no options, but other words make it one when there are enough
    const quiz = built ?? { options: [entry.word], answerIndex: 0 };
    const otherTranslation =
      other && line && other.originalLyrics && other.translations ? lineTranslation(other as Song, line) ?? undefined : undefined;
    items.push({
      way,
      listen,
      speak,
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

const phraseWordKey = (word: string) => removeSpecialChars(word).replace(/['’]/g, '').toLowerCase();

/** The words (lowercased, no apostrophes) of the saved phrases, by language, e.g. dreh and durch for "dreh' durch" */
function phraseWordsOf(words: WordEntry[]): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const w of words) {
    if (isCjkWord(w.word) || !/\s/.test(w.word.trim())) continue;
    const set = result.get(w.language) ?? new Set<string>();
    lineWords(w.word).forEach((part) => set.add(phraseWordKey(part)));
    result.set(w.language, set);
  }
  return result;
}

/**
 * The words due for review. A single word that is part of a saved phrase of the same language
 * (`all` is every saved word, by default `words`) isn't asked on its own: the phrase is.
 */
export const dueWords = (words: WordEntry[], now: number, all: WordEntry[] = words) => {
  const inPhrases = phraseWordsOf(all);
  return words.filter((w) => {
    if (!isDue(w, now)) return false;
    const isPhrase = isCjkWord(w.word) || /\s/.test(w.word.trim());
    return isPhrase || !inPhrases.get(w.language)?.has(phraseWordKey(w.word));
  });
};

/** Review session sizes to pick from when more words are due than the smallest */
export const REVIEW_SIZES = [5, 10, 20];

/** Share of a daily batch that can be old Seen words, like new cards a day */
export const SEEN_BATCH_SHARE = 0.25;

/**
 * Today's batch of a daily goal, out of the due words' items (buildReviewItems' order): `left`
 * words (the goal less today's answers). Recognized and Recalled words come first, then at most a
 * quarter of the goal in Seen words, so a pile of old Seen words comes in a few a day. `rest` is
 * every other due item, for more sessions after the batch.
 */
export function pickDailyBatch(items: ReviewItem[], goal: number, left: number): { batch: ReviewItem[]; rest: ReviewItem[] } {
  const isSeen = (i: ReviewItem) => (i.entry.masteryLevel ?? 'Seen') === 'Seen';
  const batch = items.filter((i) => !isSeen(i)).slice(0, Math.max(0, left));
  const room = Math.max(0, left) - batch.length;
  const seenCap = Math.min(room, Math.ceil(goal * SEEN_BATCH_SHARE));
  batch.push(...items.filter(isSeen).slice(0, seenCap));
  const inBatch = new Set(batch);
  return { batch, rest: items.filter((i) => !inBatch.has(i)) };
}

/** How many words the Review done screen's "more" button adds */
export const MORE_REVIEW_SIZE = REVIEW_SIZES[0];

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

/** Words in a session started from the song that's playing */
export const SONG_REVIEW_SIZE = 8;

/** The song's saved words that are due and can be asked */
export const songDueWords = (songId: string, words: WordEntry[], now = Date.now()) =>
  dueWords(
    words.filter((w) => w.contexts?.some((c) => c.songId === songId)),
    now,
    words
  ).filter(canReview);

/** A review of the song's due words, the ones needing it most first, capped at SONG_REVIEW_SIZE */
export function buildSongReview(songId: string, words: WordEntry[], songs: ReviewSong[], size = SONG_REVIEW_SIZE): ReviewItem[] {
  const due = songDueWords(songId, words);
  return due.length ? buildReviewItems(due, words, undefined, undefined, songs).slice(0, size) : [];
}

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
  const due = dueWords(words, now, words).filter(canReview);
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


/** Every way Review can ask a word, to try one out: how it's asked, and which words suit it */
export interface QuizType {
  id: string;
  label: string;
  description: string;
  icon: string;
  way: ReviewWay;
  kind: QuizKind;
  /** The levels of words that take it, since a Recalled word's lyric quiz is typed and the others picked */
  levels?: MasteryLevel[];
  needsLine?: boolean;
}

export const QUIZ_TYPES: QuizType[] = [
  { id: 'meaning', label: 'Pick the meaning', description: 'See the word, pick what it means', icon: 'list-outline', way: 'meaning', kind: 'meaning' },
  { id: 'meaning-ipa', label: 'Meaning from IPA', description: 'See only the IPA, pick the meaning', icon: 'text-outline', way: 'meaning-ipa', kind: 'meaning' },
  { id: 'meaning-listen', label: 'Meaning from audio', description: 'Hear the word, pick the meaning', icon: 'ear-outline', way: 'meaning-listen', kind: 'meaning' },
  { id: 'say-word', label: 'Say the word', description: 'See the word and say it out loud (3 points)', icon: 'mic-outline', way: 'speak', kind: 'meaning' },
  { id: 'lyric', label: 'Fill in the blank: pick', description: 'A lyric line with the word blanked out, pick it from options', icon: 'ellipsis-horizontal', way: 'lyric', kind: 'lyric', levels: ['Seen', 'Recognized'], needsLine: true },
  { id: 'lyric-typed', label: 'Fill in the blank: type', description: 'The same, typed (2 points)', icon: 'create-outline', way: 'lyric', kind: 'lyric', levels: ['Recalled'], needsLine: true },
  { id: 'lyric-listen', label: 'Hear the word', description: 'Hear the word, pick it from options', icon: 'ear-outline', way: 'lyric-listen', kind: 'lyric', levels: ['Seen', 'Recognized'] },
  { id: 'lyric-ipa', label: 'Spell from IPA', description: 'See the IPA and type the word', icon: 'text-outline', way: 'lyric-ipa', kind: 'lyric' },
  { id: 'say-gap', label: 'Say the missing word', description: 'A line with a gap, say the word that fits (3 points)', icon: 'mic-outline', way: 'speak', kind: 'lyric', needsLine: true },
];

/** A practice round of one quiz type with words of the language that suit it; answers aren't saved */
export function buildTypeItems(type: QuizType, language: string, words: WordEntry[], songs: ReviewSong[], size = 5): ReviewItem[] {
  const pool = words.filter((w) => w.language === language && (!type.levels || type.levels.includes(w.masteryLevel ?? 'Seen')));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return buildReviewItems(shuffled, words, Math.random, new Map(), songs, { way: type.way, kind: type.kind, needsLine: type.needsLine }).slice(0, size);
}
