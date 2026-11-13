import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { isRomanized } from '../constants/languages';
import type { SpotifyLyricsSync } from '../hooks/useSpotifyLyricsSync';
import { useStore } from '../store/useStore';
import type { Song, WordEntry } from '../types';
import { formatIpa } from '../utils/ipaDisplay';
import { pickLineQuiz, stepQuizLine, type LineQuizItem } from '../utils/lineQuiz';
import type { ReviewWay } from '../utils/reviewQuiz';
import Dictation from './Dictation';
import type { LearnLine } from './LearnLyricsView';
import LineDrill from './LineDrill';
import PronunciationAudio from './PronunciationAudio';
import { Text } from './Text';
import WordQuiz from './WordQuiz';

const GAP = '_____';

interface LineQuizModeProps {
  song: Song;
  lines: LearnLine[];
  /** The lines with lyrics, in order */
  contentLines: number[];
  /** The line to start on when Spotify isn't playing the song */
  startLine: number;
  /** The translations shown in Learn, the first of which is the line's hint */
  translationLanguages: string[];
  /** The saved word a lyric word stands for */
  findEntry: (word: string) => WordEntry | undefined;
  spotify: SpotifyLyricsSync;
  isWide?: boolean;
}

/**
 * Quiz mode in Learn, for a song whose words are all saved: one quiz on each line, line after line,
 * going back to the first after the last. While Spotify plays the song with synced lyrics, the line
 * playing is quizzed instead, the next one once the quiz is answered and the song has moved on.
 */
export default function LineQuizMode({
  song,
  lines,
  contentLines,
  startLine,
  translationLanguages,
  findEntry,
  spotify,
  isWide,
}: LineQuizModeProps) {
  const synced = spotify.isThisSong && spotify.timings === 'ready';
  const syncedLine =
    synced && spotify.currentLine !== null && contentLines.includes(spotify.currentLine) ? spotify.currentLine : null;
  const [quiz, setQuiz] = useState<{ lineIndex: number; item: LineQuizItem | null; round: number } | null>(null);
  const [answered, setAnswered] = useState(false);
  // The line Spotify was on when the quiz was answered: the next quiz waits for the song to move on
  const [answeredAtLine, setAnsweredAtLine] = useState<number | null>(null);
  // Words asked since quiz mode started, so a repeated chorus asks another of its words
  const asked = useRef(new Set<string>());
  // How often each way of asking a word came up, so each comes up about as often
  const wayCounts = useRef(new Map<ReviewWay, number>());

  /** Quizzes the line, or the next one with something to ask (unless it's the one Spotify plays) */
  const startAt = (target: number, step: 1 | -1 = 1, followingSpotify = false) => {
    const words = useStore.getState().words;
    let at = target;
    let item: LineQuizItem | null = null;
    for (let tries = 0; tries < contentLines.length; tries++) {
      item = pickLineQuiz({
        line: lines[at]?.original ?? '',
        lineIndex: at,
        songId: song.id,
        findEntry,
        words,
        asked: asked.current,
        counts: wayCounts.current,
        canDictate: spotify.isThisSong && spotify.times[at] != null,
      });
      if (item || followingSpotify) break;
      at = stepQuizLine(contentLines, at, step) ?? at;
    }
    if (item?.entry) asked.current.add(item.entry.id);
    setQuiz((prev) => ({ lineIndex: at, item, round: (prev?.round ?? 0) + 1 }));
    setAnswered(false);
    setAnsweredAtLine(null);
    return at;
  };

  // The line playing on Spotify, else where Learn was
  useEffect(() => {
    if (!lines.length || !contentLines.length) return;
    if (!quiz) startAt(syncedLine ?? startLine);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length, contentLines.length]);

  // Following Spotify: the line playing once the quiz is answered and the song has gone on from there,
  // or right away when there's nothing to answer on this line
  useEffect(() => {
    if (syncedLine === null || !quiz || syncedLine === quiz.lineIndex) return;
    if (quiz.item && (!answered || syncedLine === answeredAtLine)) return;
    startAt(syncedLine, 1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncedLine, answered, answeredAtLine]);

  const markAnswered = () => {
    setAnswered(true);
    setAnsweredAtLine(syncedLine);
  };

  const step = (direction: 1 | -1) => {
    if (!quiz) return;
    const target = stepQuizLine(contentLines, quiz.lineIndex, direction);
    if (target === null) return;
    const shown = startAt(target, direction);
    // Following Spotify, the song goes there too
    if (synced && spotify.times[shown] != null) void spotify.seekToLine(shown);
  };

  if (!quiz) return null;
  const { item, lineIndex, round } = quiz;
  const line = lines[lineIndex]?.original ?? '';
  const translation =
    lines[lineIndex]?.translations.find(
      (t) => t.show && t.text.trim() && !isRomanized(t.language) && translationLanguages.includes(t.language)
    )?.text.trim() || undefined;
  const position = contentLines.indexOf(lineIndex) + 1;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, isWide && styles.contentWide]} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step(-1)} hitSlop={8} style={styles.stepButton} accessibilityRole="button" accessibilityLabel="Previous line">
            <Ionicons name="chevron-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerMiddle}>
            <Text style={styles.title}>{`Quiz · Line ${position} of ${contentLines.length}`}</Text>
            {syncedLine !== null && (
              <View style={styles.following}>
                <Ionicons name="musical-note" size={12} color={SPOTIFY_GREEN} />
                <Text style={styles.followingText}>Following Spotify</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => step(1)} hitSlop={8} style={styles.stepButton} accessibilityRole="button" accessibilityLabel="Next line">
            <Ionicons name="chevron-forward" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
        {item ? (
          <LineQuestion
            key={round}
            item={item}
            line={line}
            translation={translation}
            answered={answered}
            onAnswered={markAnswered}
            onPlayLine={() => void spotify.playLine(lineIndex)}
            onSkip={() => step(1)}
            isWide={isWide}
          />
        ) : (
          <>
            <Text style={styles.line}>{line}</Text>
            <Text style={styles.hint}>Nothing to ask on this line</Text>
          </>
        )}
      </View>
      {syncedLine !== null && answered && syncedLine === lineIndex ? (
        <Text style={styles.waiting}>The next line's quiz comes as the song gets there</Text>
      ) : null}
      <TouchableOpacity
        style={[styles.nextButton, !answered && item && styles.nextButtonQuiet]}
        onPress={() => step(1)}
        accessibilityRole="button"
        accessibilityLabel={answered || !item ? 'Go on to the next line' : 'Skip this line'}
      >
        <Text style={[styles.nextText, !answered && item && styles.nextTextQuiet]}>
          {answered || !item ? (position === contentLines.length ? 'Back to the first line' : 'Next line') : 'Skip'}
        </Text>
        <Ionicons
          name={position === contentLines.length ? 'refresh' : 'arrow-forward'}
          size={16}
          color={answered || !item ? Colors.white : Colors.textSecondary}
        />
      </TouchableOpacity>
    </ScrollView>
  );
}

const SPOTIFY_GREEN = '#1DB954';

function LineQuestion({
  item,
  line,
  translation,
  answered,
  onAnswered,
  onPlayLine,
  onSkip,
  isWide,
}: {
  item: LineQuizItem;
  line: string;
  translation?: string;
  answered: boolean;
  onAnswered: () => void;
  onPlayLine: () => void;
  /** Goes on to the next line, e.g. closing the dictation */
  onSkip: () => void;
  isWide?: boolean;
}) {
  const { mode, entry, kind, wordAt, ipa, meaning, practice } = item;

  if (mode === 'drill') {
    return (
      <>
        <Text style={styles.prompt}>Rebuild the line</Text>
        <LineDrill line={line} hint={translation} onDone={onAnswered} />
      </>
    );
  }
  if (mode === 'dictation') {
    return (
      <>
        {answered && <Text style={styles.line}>{line}</Text>}
        <Dictation line={line} onPlay={onPlayLine} onChecked={(checked) => checked && onAnswered()} onClose={onSkip} />
      </>
    );
  }
  if (!entry || !kind || !item.quiz || !wordAt) return null;

  const before = line.slice(0, wordAt.start);
  const lineWord = line.slice(wordAt.start, wordAt.end);
  const after = line.slice(wordAt.end);
  // What would give the answer away shows once it's answered: an IPA or listening quiz shows nothing
  // else, a gap shows the line without the word, a meaning quiz hides the line's translation
  const showLine = answered || (!ipa && mode !== 'listen');
  const blank = !answered && (mode === 'gap' || mode === 'spell');
  const hint =
    kind === 'meaning'
      ? answered
        ? translation
        : undefined
      : mode === 'gap'
        ? translation || meaning
        : answered
          ? translation || meaning
          : undefined;

  return (
    <>
      {showLine && (
        <Text style={styles.line}>
          {before}
          {blank ? GAP : <Text style={[styles.line, styles.lineWord, answered && kind === 'lyric' && styles.lineAnswer]}>{lineWord}</Text>}
          {after}
        </Text>
      )}
      {mode === 'listen' && !answered && <PronunciationAudio audio={entry.audio ?? []} autoPlay />}
      {ipa && <Text style={styles.ipa}>{formatIpa(ipa, true)}</Text>}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <WordQuiz
        entry={entry}
        kind={kind}
        prompt={
          kind === 'meaning' && ipa && !answered ? (
            'What does this word mean?'
          ) : kind === 'meaning' && mode === 'listen' && !answered ? (
            'What does the word you heard mean?'
          ) : kind === 'meaning' ? (
            <>
              What does <Text style={styles.quizWord}>{lineWord}</Text> mean here?
            </>
          ) : mode === 'spell' ? (
            'Spell the word pronounced like this'
          ) : mode === 'listen' ? (
            'Which word did you hear?'
          ) : (
            'Which word goes in the gap?'
          )
        }
        build={() => item.quiz!}
        onAnswered={onAnswered}
        practice={practice}
        typed={mode === 'spell'}
        showDue={!practice}
        isWide={isWide}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 12,
    gap: 10,
  },
  contentWide: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerMiddle: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  following: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  followingText: {
    fontSize: 12,
    color: SPOTIFY_GREEN,
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prompt: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  line: {
    fontSize: 20,
    lineHeight: 28,
    color: Colors.text,
  },
  lineWord: {
    fontWeight: '700',
  },
  lineAnswer: {
    color: Colors.success,
  },
  ipa: {
    fontSize: 26,
    color: Colors.text,
    textAlign: 'center',
    paddingVertical: 8,
  },
  hint: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  quizWord: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  waiting: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
  },
  nextButtonQuiet: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nextText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  nextTextQuiet: {
    color: Colors.textSecondary,
  },
});
