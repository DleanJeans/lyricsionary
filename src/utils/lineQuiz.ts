import type { MasteryLevel, WordContext, WordEntry } from '../types';
import type { PartOfSpeech } from './partOfSpeech';
import { cleanLyricWord, isLyricWord, removeSpecialChars, splitEdgePunctuation, splitLyricTokens } from './cleanLyrics';
import { groupCjkTokens, groupSpacedWords } from './cjkWords';
import { lineDrillPieces } from './lineDrill';
import { lineWords, reviewIpa, reviewWays, type ReviewWay } from './reviewQuiz';
import { buildLyricQuiz, buildMeaningQuiz, isCoolingDown, isTricky, type Quiz, type QuizKind, quizKindFor } from './wordQuiz';

/**
 * How a line is quizzed in Learn's quiz mode:
 * - meaning: pick the meaning of a word in the line (from its IPA alone when `ipa` is set)
 * - gap: pick (or, for a Recalled word, type) the word blanked out of the line
 * - spell: type the word from its IPA alone
 * - listen: pick the word heard from its recording, or its meaning for a meaning quiz
 * - drill: rebuild the line from its shuffled words
 * - dictation: write the line down from hearing it on Spotify
 */
export type LineQuizMode = 'meaning' | 'gap' | 'spell' | 'listen' | 'drill' | 'dictation';

export interface LineQuizItem {
  lineIndex: number;
  mode: LineQuizMode;
  /** The saved word asked about, for every mode but drill and dictation */
  entry?: WordEntry;
  kind?: QuizKind;
  quiz?: Quiz;
  /** Where the word is in the line, to bold it or blank it out */
  wordAt?: { start: number; end: number };
  /** The IPA a meaning or spelling quiz is asked from, without slashes */
  ipa?: string;
  /** The meaning the word has here, shown once a lyric quiz is answered */
  meaning?: string;
  /**
   * The answer isn't saved: the word's level quizzes it another way, or it was quizzed in the last
   * few hours, e.g. on the chorus's last time round
   */
  practice: boolean;
}

/** A word of the line, with where its letters are */
export interface LineWord {
  /** The word as the lyrics have it, without punctuation */
  text: string;
  start: number;
  end: number;
}

/**
 * The line's words, tokenized the way Learn lays them out to tap (so a saved phrase or a Chinese word
 * of several characters is one), each with where it is in the line
 */
export function lineWordsAt(line: string, isWord: (candidate: string) => boolean): LineWord[] {
  const tokens = groupSpacedWords(groupCjkTokens(splitLyricTokens(line), isWord), isWord);
  const found: LineWord[] = [];
  let pos = 0;
  for (const token of tokens) {
    const at = line.indexOf(token, pos);
    if (at === -1) continue;
    pos = at + token.length;
    if (!token.trim()) continue;
    const text = cleanLyricWord(token);
    if (!text || !isLyricWord(text)) continue;
    const { leading, core } = splitEdgePunctuation(token);
    const start = at + leading.length;
    found.push({ text, start, end: start + Math.max(core.length, 1) });
  }
  return found;
}

const LEVEL_ORDER: Record<MasteryLevel, number> = { Seen: 3, Recognized: 2, Recalled: 1, Known: 0 };

/** The context saved for this line of the song, else for the song, else any with a meaning */
export function lineContext(entry: WordEntry, songId: string | undefined, line: string): WordContext | undefined {
  const contexts = entry.contexts ?? [];
  return (
    contexts.find((c) => c.songId === songId && c.context === line && c.definition?.trim()) ??
    contexts.find((c) => c.songId === songId && c.definition?.trim()) ??
    contexts.find((c) => c.definition?.trim())
  );
}

const meaningOf = (entry: WordEntry, context: WordContext | undefined) =>
  context?.definition?.trim() || entry.definitions?.find((d) => d.text.trim())?.text.trim() || undefined;

export interface PickLineQuizOptions {
  line: string;
  lineIndex: number;
  songId?: string;
  /** The saved word a lyric word stands for, e.g. Learn's findSavedEntry */
  findEntry: (word: string) => WordEntry | undefined;
  /** Every saved word, for the quizzes' wrong options */
  words: WordEntry[];
  /** Words already asked since quiz mode started, so a repeated chorus asks another one */
  asked?: ReadonlySet<string>;
  /** Spotify plays this song with the line's time known, so the line can be written down from hearing it */
  canDictate?: boolean;
  /**
   * How often each way of asking a word was used since quiz mode started, so each comes up about as
   * often, as in Review (buildReviewItems); updated with the way picked
   */
  counts?: Map<ReviewWay, number>;
  random?: () => number;
  now?: number;
}

/**
 * A quiz for one lyric line: one of its saved words, the one whose answer would count first (not
 * quizzed in the last few hours, its level's kind of quiz), then a tricky one, then one not asked yet
 * in this round, then the lowest level. Seen words get their meaning asked, the others are blanked
 * out of the line, spelled from their IPA or heard. Now and then the whole line is rebuilt (or
 * written down from Spotify) instead. A line without saved words is rebuilt from its words if it has
 * a few; null when there's nothing to ask, e.g. "Oh".
 */
export function pickLineQuiz({
  line,
  lineIndex,
  songId,
  findEntry,
  words,
  asked = new Set(),
  canDictate = false,
  counts = new Map(),
  random = Math.random,
  now = Date.now(),
}: PickLineQuizOptions): LineQuizItem | null {
  if (!line.trim()) return null;
  const canDrill = lineDrillPieces(line).length >= 3;
  const wholeLine = (): LineQuizItem | null =>
    canDictate && random() < 0.5
      ? { lineIndex, mode: 'dictation', practice: true }
      : canDrill
        ? { lineIndex, mode: 'drill', practice: true }
        : canDictate
          ? { lineIndex, mode: 'dictation', practice: true }
          : null;

  const candidates = lineWordsAt(line, (candidate) => !!findEntry(candidate))
    .map((word) => ({ word, entry: findEntry(word.text) }))
    .filter((c): c is { word: LineWord; entry: WordEntry } => !!c.entry);
  // One spot per word, its first in the line
  const seen = new Set<string>();
  const unique = candidates.filter((c) => !seen.has(c.entry.id) && !!seen.add(c.entry.id));
  if (!unique.length) return wholeLine();

  // Now and then the whole line, to hear or rebuild it
  if ((canDrill || canDictate) && random() < (canDictate ? 0.25 : 0.15)) {
    const item = wholeLine();
    if (item) return item;
  }

  const score = ({ entry }: { entry: WordEntry }) => {
    const kind = quizKindFor(entry.masteryLevel);
    const counts = !!kind && !isCoolingDown(entry.quiz, now);
    return (
      (counts ? 1000 : 0) +
      (isTricky(entry.quiz, now) ? 100 : 0) +
      (asked.has(entry.id) ? 0 : 50) +
      LEVEL_ORDER[entry.masteryLevel ?? 'Seen'] * 10 +
      random()
    );
  };
  const ranked = unique.map((c) => ({ ...c, score: score(c) })).sort((a, b) => b.score - a.score);

  for (const { word, entry } of ranked) {
    const item = wordQuiz(entry, word, line, lineIndex, songId, words, counts, random, now);
    if (item) return item;
  }
  return wholeLine();
}

function wordQuiz(
  entry: WordEntry,
  word: LineWord,
  line: string,
  lineIndex: number,
  songId: string | undefined,
  words: WordEntry[],
  counts: Map<ReviewWay, number>,
  random: () => number,
  now: number
): LineQuizItem | null {
  const levelKind = quizKindFor(entry.masteryLevel);
  const context = lineContext(entry, songId, line);
  const meaning = meaningOf(entry, context);
  const partOfSpeech: PartOfSpeech | undefined = context?.partOfSpeech;
  // The line has the word itself, not a form or a part of it, e.g. aime in j't'aime: it can be blanked
  // out, spelled or heard
  const exact = word.text.toLowerCase() === entry.word.toLowerCase();
  const kind: QuizKind = levelKind === 'meaning' && meaning ? 'meaning' : exact ? 'lyric' : meaning ? 'meaning' : 'lyric';
  if (kind === 'lyric' && !exact) return null;
  const practice = kind !== levelKind || isCoolingDown(entry.quiz, now);
  const ipaText = exact ? reviewIpa(entry, context) : undefined;
  const wordAt = { start: word.start, end: word.end };

  const quiz =
    kind === 'meaning'
      ? buildMeaningQuiz({ entry, answer: meaning!, partOfSpeech, songId }, words, random, now)
      : buildLyricQuiz(
          {
            entry,
            answer: entry.word,
            partOfSpeech,
            songId,
            // Words the line shows can't be what's missing from it
            excludeWords: [...line.split(/\s+/).map(removeSpecialChars), ...lineWords(line)].filter(Boolean),
          },
          words,
          random,
          now
        );
  // The way asked least so far among the ones the word has, as in Review
  const ways = reviewWays(kind, { hasQuiz: !!quiz, hasLine: true, hasAudio: exact && !!entry.audio?.length, hasIpa: !!ipaText });
  if (!ways.length) return null;
  const fewest = Math.min(...ways.map((w) => counts.get(w) ?? 0));
  const least = ways.filter((w) => (counts.get(w) ?? 0) === fewest);
  const way = least[Math.min(least.length - 1, Math.floor(random() * least.length))];
  counts.set(way, fewest + 1);
  const ipa = way.endsWith('ipa') ? ipaText : undefined;
  const mode: LineQuizMode = way.endsWith('listen') ? 'listen' : kind === 'meaning' ? 'meaning' : ipa ? 'spell' : 'gap';
  // Spelling is typed, so it needs no other options
  return { lineIndex, mode, entry, kind, quiz: quiz ?? { options: [entry.word], answerIndex: 0 }, wordAt, ipa, meaning, practice };
}

/** The line after (or before, with step -1) the one quizzed, going back to the first after the last */
export function stepQuizLine(contentLines: number[], lineIndex: number, step: 1 | -1): number | null {
  if (!contentLines.length) return null;
  const at = contentLines.indexOf(lineIndex);
  if (at === -1) {
    const next = step === 1 ? contentLines.find((i) => i > lineIndex) : [...contentLines].reverse().find((i) => i < lineIndex);
    return next ?? contentLines[step === 1 ? 0 : contentLines.length - 1];
  }
  return contentLines[(at + step + contentLines.length) % contentLines.length];
}
