import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { listenForWord } from '../services/speechRecognition';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { useStore } from '../store/useStore';
import { MASTERY_LEVELS, MasteryLevel, WordEntry } from '../types';
import { moveField } from '../utils/activity';
import { checkTypedAnswer, isCoolingDown, isTypedQuiz, levelProgress, progressHint, progressLabel, Quiz, QuizKind, quizKindFor, recordAnswer } from '../utils/wordQuiz';
import { Text, TextInput } from './Text';
import { getFlagForLanguage } from '../constants/languages';
import DueLabel from './DueLabel';
import PronunciationAudio from './PronunciationAudio';
import WordFrequency from './WordFrequency';
import { useWiktionaryPronunciation } from '../hooks/useWiktionaryPronunciation';

interface WordQuizProps {
  entry: WordEntry;
  kind: QuizKind;
  prompt: ReactNode;
  /** Builds the options once, when the quiz first shows, so saving the answer doesn't reshuffle them */
  build: () => Quiz | null;
  /** Hides a quiz not answered yet, e.g. once the line's translation has been seen */
  hidden?: boolean;
  /** Answered before since the song opened, so it isn't asked when it next shows */
  alreadyAnswered?: boolean;
  onAnswered?: (correct: boolean) => void;
  isWide?: boolean;
  /** Asked again for practice, e.g. a review's missed word: always shown, and the answer isn't saved */
  practice?: boolean;
  /** Told whether the quiz is showing and not answered yet, e.g. to hide what would give the answer away */
  onPendingChange?: (pending: boolean) => void;
  /** Shows when the word's next quiz counts at the end of the result row, e.g. "Next quiz in 4 hours" */
  showDue?: boolean;
  /** Told whether the quiz shows its result, e.g. so the word card doesn't show the next quiz time twice */
  onAnsweredChange?: (answered: boolean) => void;
  /** Typed instead of picked whatever the word's level, e.g. spelling a word from its IPA */
  typed?: boolean;
  /** Said out loud instead of picked: the speech recognizer listens and what it hears is checked like a typed answer */
  spoken?: boolean;
  /** Shows the word's recordings once answered; off where they already show, e.g. in a listening quiz */
  audio?: boolean;
  /** Called before a word in the songs-and-sentences list opens its page, e.g. to close the dialog the quiz is in */
  onLookUpWord?: () => void;
  /**
   * Once answered, shows a one-line verdict in place of the prompt, answer and result, then what this
   * returns (e.g. the word and line cards), then the songs-and-sentences pill and the level track
   */
  renderAnswered?: (current: WordEntry) => ReactNode;
  /** Said on the verdict of a wrong answer, e.g. "Again at the end" when a review asks it once more */
  missedNote?: string;
}

/**
 * Resolves once the answer has been drawn. Saving it updates every screen showing saved words, which
 * takes a while with a big library, so the pick shows first instead of after that.
 */
const afterPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

/** A few options to pick from in the Learn word card. Remount it (key) for another word or line. */
export default function WordQuiz({ entry, kind, prompt, build, hidden = false, alreadyAnswered = false, onAnswered, isWide, practice = false, onPendingChange, showDue = false, onAnsweredChange, typed: typedProp = false, spoken = false, audio: showAudio = true, onLookUpWord, renderAnswered, missedNote }: WordQuizProps) {
  const recordQuizAnswer = useStore((s) => s.recordQuizAnswer);
  const updateWordEntry = useStore((s) => s.updateWordEntry);
  const recordActivity = useStore((s) => s.recordActivity);
  // Asked only when the quiz is for the word's level, decided once so moving up a level keeps the
  // answer on screen. A word quizzed in the last few hours isn't asked again, e.g. when the chorus
  // repeats it.
  const [quiz] = useState(() =>
    practice ? build() :
    alreadyAnswered || quizKindFor(entry.masteryLevel) !== kind || isCoolingDown(entry.quiz, Date.now()) ? null : build()
  );
  // The word before the answer, where the level track starts
  const [unanswered] = useState(entry);
  const [chosen, setChosen] = useState<number | null>(null);
  const [before, setBefore] = useState<WordEntry | null>(null);
  // The word as the answer will leave it, shown right away since saving can take a few seconds
  const [predicted, setPredicted] = useState<WordEntry | null>(null);
  const [undone, setUndone] = useState(false);
  // A Recalled word is typed instead of picked
  const [typed] = useState(() => spoken || typedProp || isTypedQuiz(entry.masteryLevel, kind));
  const [typedText, setTypedText] = useState('');
  const [listening, setListening] = useState(false);
  // What the speech recognizer made of the last try, when it wasn't the word
  const [speechNote, setSpeechNote] = useState<string | null>(null);
  const stopListening = useRef<(() => void) | null>(null);
  useEffect(() => () => stopListening.current?.(), []);
  const [typedResult, setTypedResult] = useState<'right' | 'accents' | 'wrong' | null>(null);
  const stored = useStore((s) => s.words.find((w) => w.id === entry.id)) ?? entry;
  // Until the answer is saved, what it will save; after that (and on Undo) the saved word
  const current = predicted && !before && !undone ? predicted : stored;
  // Before paint, so nothing the quiz would give away shows for a frame
  const pending = !!quiz && !hidden && chosen === null && typedResult === null;
  useLayoutEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);
  useLayoutEffect(() => () => onPendingChange?.(false), [onPendingChange]);
  const shownAnswered = !!quiz && (chosen !== null || typedResult !== null);
  useLayoutEffect(() => {
    onAnsweredChange?.(shownAnswered);
  }, [shownAnswered, onAnsweredChange]);
  useLayoutEffect(() => () => onAnsweredChange?.(false), [onAnsweredChange]);

  if (!quiz || (hidden && chosen === null && typedResult === null)) return null;

  const answered = chosen !== null || typedResult !== null;
  const due = showDue && !practice ? <DueLabel entry={current} inline /> : null;
  const correct = typed ? typedResult === 'right' || typedResult === 'accents' : chosen === quiz.answerIndex;
  const levelUp: MasteryLevel | null =
    answered && !undone && (current.masteryLevel ?? 'Seen') !== (unanswered.masteryLevel ?? 'Seen') ? current.masteryLevel ?? null : null;

  /** Shows the answer's level change before it's saved */
  const predict = (right: boolean) =>
    setPredicted({ ...stored, ...recordAnswer(stored.masteryLevel, stored.quiz, kind, right, Date.now()) });

  const choose = async (index: number) => {
    if (answered) return;
    setChosen(index);
    onAnswered?.(index === quiz.answerIndex);
    if (practice) return;
    predict(index === quiz.answerIndex);
    await afterPaint();
    setBefore((await recordQuizAnswer(entry.id, kind, index === quiz.answerIndex)) ?? null);
  };

  const submitTyped = async (giveUp = false, result?: 'right' | 'accents' | 'wrong') => {
    if (answered || (!giveUp && !result && !typedText.trim())) return;
    result = giveUp ? 'wrong' : result ?? checkTypedAnswer(typedText, entry.word);
    setTypedResult(result);
    const right = result !== 'wrong';
    onAnswered?.(right);
    if (practice) return;
    predict(right);
    await afterPaint();
    setBefore((await recordQuizAnswer(entry.id, kind, right)) ?? null);
  };

  /** Listens for the word; a right try answers the quiz, a wrong one can be tried again */
  const listen = () => {
    if (answered || listening) return;
    setSpeechNote(null);
    setListening(true);
    stopListening.current = listenForWord(entry.language, (outcome) => {
      stopListening.current = null;
      setListening(false);
      if (outcome.type === 'denied') return setSpeechNote('Allow the microphone for Lyricsionary in Settings to say words.');
      if (outcome.type === 'unavailable') return setSpeechNote("This phone can't recognize speech here. Try another quiz.");
      if (outcome.type === 'nothing') return setSpeechNote("Didn't catch that. Tap the mic and try again.");
      // Any of the recognizer's guesses counts, and accents can't be heard
      const results = outcome.alternatives.map((heard) => checkTypedAnswer(heard, entry.word));
      if (results.includes('right') || results.includes('accents')) void submitTyped(false, 'right');
      else setSpeechNote(`Heard "${outcome.alternatives[0]}". Try again.`);
    });
  };

  const undo = () => {
    if (!before) return;
    setUndone(true);
    void updateWordEntry(entry.id, { masteryLevel: before.masteryLevel, quiz: before.quiz, history: before.history });
    // Undo is only offered for a level up
    const field = moveField(current.masteryLevel ?? 'Seen');
    void recordActivity({ levelUps: -1, ...(field ? { [field]: -1 } : {}) });
  };


  if (answered && renderAnswered) {
    const levelDown = !!levelUp && MASTERY_LEVELS.indexOf(levelUp) < MASTERY_LEVELS.indexOf(unanswered.masteryLevel ?? 'Seen');
    // What was picked, typed or said, struck through when it was wrong
    const given = typed ? typedText.trim() : quiz.options[chosen ?? -1];
    const answer = typed ? entry.word : quiz.options[quiz.answerIndex];
    return (
      <View style={styles.answeredContainer}>
        <View style={[styles.verdict, correct ? styles.verdictRight : styles.verdictWrong]}>
          <Ionicons name={correct ? 'checkmark-circle-outline' : 'close-circle-outline'} size={20} color={correct ? Colors.success : Colors.danger} />
          <Text style={styles.verdictText}>
            {typedResult === 'accents' ? (
              <>
                Mind the accents: <Text style={[styles.verdictText, styles.levelText]}>{answer}</Text>
              </>
            ) : correct ? (
              <>
                Right, <Text style={[styles.verdictText, styles.levelText]}>{answer}</Text>
              </>
            ) : (
              <>
                {given ? (
                  <>
                    <Text style={[styles.verdictText, styles.verdictGiven]}>{given}</Text>
                    {'  '}it's{' '}
                  </>
                ) : (
                  "It's "
                )}
                <Text style={[styles.verdictText, styles.levelText]}>{answer}</Text>
              </>
            )}
          </Text>
          {levelUp ? (
            <View style={styles.verdictSide}>
              <Ionicons name={levelDown ? 'arrow-down' : 'arrow-up'} size={13} color={getMasteryLevelColor(levelUp)} />
              <Text style={[styles.verdictNote, { color: getMasteryLevelColor(levelUp) }]}>{levelUp}</Text>
              {before && (
                <TouchableOpacity onPress={undo} hitSlop={8} accessibilityRole="button" accessibilityLabel="Undo level change">
                  <Text style={styles.undoText}>Undo</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : !correct && missedNote && !practice ? (
            <View style={styles.verdictSide}>
              <Ionicons name="refresh" size={13} color={Colors.textSecondary} />
              <Text style={styles.verdictNote}>{missedNote}</Text>
            </View>
          ) : null}
        </View>
        {renderAnswered(current)}
        <View style={{ alignItems: 'flex-start' }}>
          <WordFrequency entry={current} onLookUpWord={onLookUpWord} pill />
        </View>
        {!practice && <LevelTrack from={unanswered} entry={current} />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.promptRow, spoken && styles.promptRowCentered]}>
        <Text style={styles.flag} accessibilityLabel={`${entry.language} word`}>
          {getFlagForLanguage(entry.language)}
        </Text>
        <Text style={[styles.prompt, spoken ? styles.promptTextCentered : styles.promptText]}>{prompt}</Text>
      </View>
      {spoken ? (
        <View style={styles.speakBox}>
          {!answered && (
            <TouchableOpacity
              style={[styles.micButton, listening && styles.micButtonOn]}
              onPress={listening ? () => stopListening.current?.() : listen}
              accessibilityRole="button"
              accessibilityLabel={listening ? 'Stop listening' : 'Say the word'}
            >
              <Ionicons name={listening ? 'stop' : 'mic'} size={28} color={Colors.white} />
            </TouchableOpacity>
          )}
          {!answered && <Text style={styles.speakHint}>{listening ? 'Listening…' : speechNote ?? 'Tap the mic and say it'}</Text>}
        </View>
      ) : typed ? (
        <View style={styles.typedRow}>
          <TextInput
            style={[
              styles.typedInput,
              typedResult && (correct ? styles.optionRight : styles.optionWrong),
            ]}
            value={typedText}
            onChangeText={setTypedText}
            onSubmitEditing={() => void submitTyped()}
            editable={!answered}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            placeholder="Type the word"
            placeholderTextColor={Colors.textMuted}
            accessibilityLabel="Your answer"
          />
          {!answered && (
            <TouchableOpacity
              style={[styles.checkButton, !typedText.trim() && styles.checkButtonDisabled]}
              onPress={() => void submitTyped()}
              disabled={!typedText.trim()}
              accessibilityRole="button"
              accessibilityLabel="Check answer"
            >
              <Text style={styles.checkButtonText}>Check</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={[styles.options, isWide && styles.optionsWide]}>
          {quiz.options.map((option, index) => {
            const isAnswer = index === quiz.answerIndex;
            const state = !answered ? null : isAnswer ? 'right' : index === chosen ? 'wrong' : 'other';
            // Once answered, only the answer and a wrong pick stay
            if (state === 'other') return null;
            return (
              <TouchableOpacity
                key={`${index}-${option}`}
                style={[
                  styles.option,
                  isWide && styles.optionWide,
                  state === 'right' && styles.optionRight,
                  state === 'wrong' && styles.optionWrong,
                ]}
                onPress={() => void choose(index)}
                disabled={answered}
                accessibilityRole="button"
                accessibilityLabel={option}
                accessibilityState={{ disabled: answered, selected: index === chosen }}
              >
                <Text style={[styles.optionText, state === 'right' && styles.optionTextRight]} numberOfLines={3}>
                  {option}
                </Text>
                {state === 'right' && <Ionicons name="checkmark-circle" size={16} color={Colors.success} />}
                {state === 'wrong' && <Ionicons name="close-circle" size={16} color={Colors.danger} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {answered && (
        <View style={styles.resultRow}>
          {levelUp ? (
            <>
              <Text style={styles.resultText}>
                {entry.word} is now{' '}
                <Text style={[styles.resultText, styles.levelText, { color: getMasteryLevelColor(levelUp) }]}>{levelUp}</Text>
              </Text>
              {due}
              {/* Offered once the answer is saved, so Undo has the level to go back to */}
              {before && (
                <TouchableOpacity onPress={undo} hitSlop={8} accessibilityRole="button" accessibilityLabel="Undo level change">
                  <Text style={styles.undoText}>Undo</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={styles.resultText}>
              {typedResult === 'accents' ? (
                <>
                  Right! Mind the accents: <Text style={[styles.resultText, styles.levelText]}>{entry.word}</Text>
                </>
              ) : typedResult === 'wrong' ? (
                <>
                  It's <Text style={[styles.resultText, styles.levelText]}>{entry.word}</Text>
                </>
              ) : correct ? (
                'Right!'
              ) : (
                'Not quite.'
              )}
            </Text>
          )}
          {!levelUp && due}
        </View>
      )}
      {answered && showAudio && <AnswerAudio entry={current} />}
      {typed && !answered && (
        <TouchableOpacity style={styles.giveUp} onPress={() => void submitTyped(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Show the answer">
          <Text style={styles.giveUpText}>{spoken ? "I can't say it" : "I don't remember"}</Text>
        </TouchableOpacity>
      )}
      {answered && <WordFrequency entry={current} onLookUpWord={onLookUpWord} />}
      {answered && !practice && <LevelTrack from={unanswered} entry={current} />}
    </View>
  );
}

/** The word's recordings after an answer, to hear how it sounds. Fetched once for a word saved without any. */
export function AnswerAudio({ entry, collapsed = false }: { entry: WordEntry; collapsed?: boolean }) {
  const setWordAudio = useStore((s) => s.setWordAudio);
  const wiktionary = useWiktionaryPronunciation(entry.word, entry.language, { savedAudio: entry.audio, needsIpa: false });
  useEffect(() => {
    if (!entry.audio && wiktionary.loaded) void setWordAudio(entry.id, wiktionary.audio);
  }, [entry.id, entry.audio, wiktionary.loaded, wiktionary.audio, setWordAudio]);
  if (wiktionary.audio.length === 0) return null;
  if (collapsed) return <PronunciationAudio audio={wiktionary.audio} short compact collapsed />;
  return (
    <View style={{ alignItems: 'flex-start' }}>
      <PronunciationAudio audio={wiktionary.audio} short />
    </View>
  );
}

/** The four levels with the gap after the word's level filling up toward the next one */
/** How full each gap between levels is, left to right, and the index of the word's level */
function trackFills(entry: WordEntry) {
  const level = entry.masteryLevel ?? 'Seen';
  const levelIndex = MASTERY_LEVELS.indexOf(level);
  const progress = levelProgress(level, entry.quiz);
  const fills = MASTERY_LEVELS.slice(1).map((_, i) => (i < levelIndex ? 1 : i === levelIndex ? progress : 0));
  return { fills, levelIndex };
}

/**
 * When each gap and dot starts moving, so a jump of several levels fills the gaps one after another
 * from the left, each dot lighting up once the gap before it is full, and empties them from the right
 */
function trackDelays(before: WordEntry, after: WordEntry) {
  const a = trackFills(before).fills;
  const b = trackFills(after).fills;
  const changed = b.map((fill, i) => fill !== a[i]);
  const forward = b.some((fill, i) => fill > a[i]);
  const changedUpTo = (i: number) => changed.slice(0, i + 1).filter(Boolean).length;
  const changedFrom = (i: number) => changed.slice(i).filter(Boolean).length;
  return {
    bars: b.map((_, i) => (forward ? changedUpTo(i) - 1 : changedFrom(i) - 1) * TRACK_MS),
    // Dot i sits after gap i - 1
    dots: MASTERY_LEVELS.map((_, i) => (forward ? changedUpTo(i - 1) : changedFrom(i)) * TRACK_MS),
  };
}

function LevelTrack({ from, entry }: { from: WordEntry; entry: WordEntry }) {
  // Starts where the word was before the answer, then slides to where it is now, also back on Undo
  const [track, setTrack] = useState(() => ({ shown: from, delays: trackDelays(from, from) }));
  useEffect(() => setTrack((prev) => ({ shown: entry, delays: trackDelays(prev.shown, entry) })), [entry]);
  const { shown, delays } = track;
  const level = shown.masteryLevel ?? 'Seen';
  const { fills, levelIndex } = trackFills(shown);
  const hint = progressHint(level, entry.quiz, Date.now());
  return (
    <View accessible accessibilityLabel={progressLabel(level, entry.quiz) ?? `${entry.word} is ${level}`}>
      <View style={styles.track}>
        {/* Runs between the first and last dot's centers, a quarter of the width per gap */}
        <View style={styles.trackBars}>
          {MASTERY_LEVELS.slice(1).map((next, i) => {
            const fill = fills[i];
            const from = getMasteryLevelColor(MASTERY_LEVELS[i]);
            const to = getMasteryLevelColor(next);
            return (
              <View key={next} style={styles.trackBar}>
                <Animated.View
                  style={[
                    styles.trackFill,
                    {
                      transitionProperty: 'width',
                      transitionDuration: TRACK_MS,
                      transitionDelay: Math.max(0, delays.bars[i]),
                      transitionTimingFunction: 'ease-out',
                    },
                    { width: `${fill * 100}%`, backgroundColor: to, experimental_backgroundImage: `linear-gradient(to right, ${from}, ${to})` },
                  ]}
                />
              </View>
            );
          })}
        </View>
        {MASTERY_LEVELS.map((name, i) => {
          const color = getMasteryLevelColor(name);
          return (
            <View key={name} style={styles.trackStop}>
              <Animated.View
                style={[
                  styles.trackDot,
                  { transitionProperty: ['backgroundColor', 'borderColor', 'transform'], transitionDuration: 250, transitionDelay: delays.dots[i] },
                  i <= levelIndex && { backgroundColor: color, borderColor: color },
                  i === levelIndex && styles.trackDotCurrent,
                ]}
              />
              <Text style={[styles.trackLabel, i === levelIndex && { color, fontWeight: '700' }]} numberOfLines={1}>
                {name}
              </Text>
            </View>
          );
        })}
      </View>
      {hint && <Text style={styles.trackHint}>{hint}</Text>}
    </View>
  );
}

const TRACK_DOT = 10;
const TRACK_MS = 300;

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    gap: 8,
  },
  answeredContainer: {
    gap: 10,
  },
  verdict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  verdictRight: {
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    borderColor: 'rgba(0, 184, 148, 0.35)',
  },
  verdictWrong: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: 'rgba(255, 107, 107, 0.35)',
  },
  verdictText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  verdictGiven: {
    color: Colors.danger,
    textDecorationLine: 'line-through',
  },
  verdictSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  verdictNote: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  promptRowCentered: {
    justifyContent: 'center',
  },
  promptTextCentered: {
    flexShrink: 1,
  },
  flag: {
    fontSize: 16,
    lineHeight: 20,
  },
  promptText: {
    flex: 1,
  },
  prompt: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionsWide: {
    flexDirection: 'column',
  },
  option: {
    flexBasis: '45%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  optionWide: {
    flexBasis: 'auto',
  },
  optionRight: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(0, 184, 148, 0.12)',
  },
  optionWrong: {
    borderColor: Colors.danger,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
  },
  optionText: {
    flexShrink: 1,
    fontSize: 15,
    color: Colors.text,
  },
  optionTextRight: {
    fontWeight: '600',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  resultText: {
    flexShrink: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  levelText: {
    fontWeight: '700',
  },
  track: {
    flexDirection: 'row',
  },
  trackBars: {
    position: 'absolute',
    top: TRACK_DOT / 2 - 2,
    left: '12.5%',
    right: '12.5%',
    flexDirection: 'row',
  },
  trackBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
  },
  trackStop: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  trackDot: {
    width: TRACK_DOT,
    height: TRACK_DOT,
    borderRadius: TRACK_DOT / 2,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  trackDotCurrent: {
    transform: [{ scale: 1.4 }],
  },
  trackLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  trackHint: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  speakBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  micButtonOn: {
    backgroundColor: Colors.danger,
  },
  speakHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  typedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typedInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: Colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  checkButton: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  checkButtonDisabled: {
    opacity: 0.5,
  },
  checkButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  giveUp: {
    alignSelf: 'center',
  },
  giveUpText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  undoText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});
