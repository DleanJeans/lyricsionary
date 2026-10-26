import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { useStore } from '../store/useStore';
import { MASTERY_LEVELS, MasteryLevel, WordEntry } from '../types';
import { isCoolingDown, levelProgress, progressHint, progressLabel, Quiz, QuizKind, quizKindFor } from '../utils/wordQuiz';
import { Text } from './Text';

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
}

/** A few options to pick from in the Learn word card. Remount it (key) for another word or line. */
export default function WordQuiz({ entry, kind, prompt, build, hidden = false, alreadyAnswered = false, onAnswered, isWide }: WordQuizProps) {
  const recordQuizAnswer = useStore((s) => s.recordQuizAnswer);
  const updateWordEntry = useStore((s) => s.updateWordEntry);
  // Asked only when the quiz is for the word's level, decided once so moving up a level keeps the
  // answer on screen. A word quizzed in the last few hours isn't asked again, e.g. when the chorus
  // repeats it.
  const [quiz] = useState(() =>
    alreadyAnswered || quizKindFor(entry.masteryLevel) !== kind || isCoolingDown(entry.quiz, Date.now()) ? null : build()
  );
  // The word before the answer, where the level track starts
  const [unanswered] = useState(entry);
  const [chosen, setChosen] = useState<number | null>(null);
  const [before, setBefore] = useState<WordEntry | null>(null);
  const [undone, setUndone] = useState(false);
  const current = useStore((s) => s.words.find((w) => w.id === entry.id)) ?? entry;

  if (!quiz || (hidden && chosen === null)) return null;

  const answered = chosen !== null;
  const correct = chosen === quiz.answerIndex;
  const levelUp: MasteryLevel | null =
    before && !undone && current.masteryLevel !== before.masteryLevel ? current.masteryLevel ?? null : null;

  const choose = async (index: number) => {
    if (answered) return;
    setChosen(index);
    onAnswered?.(index === quiz.answerIndex);
    setBefore((await recordQuizAnswer(entry.id, kind, index === quiz.answerIndex)) ?? null);
  };

  const undo = () => {
    if (!before) return;
    setUndone(true);
    void updateWordEntry(entry.id, { masteryLevel: before.masteryLevel, quiz: before.quiz });
  };


  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{prompt}</Text>
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
      {answered && (
        <View style={styles.resultRow}>
          {levelUp ? (
            <>
              <Text style={styles.resultText}>
                {entry.word} is now{' '}
                <Text style={[styles.resultText, styles.levelText, { color: getMasteryLevelColor(levelUp) }]}>{levelUp}</Text>
              </Text>
              <TouchableOpacity onPress={undo} hitSlop={8} accessibilityRole="button" accessibilityLabel="Undo level change">
                <Text style={styles.undoText}>Undo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.resultText}>{correct ? 'Right!' : 'Not quite.'}</Text>
          )}
        </View>
      )}
      {answered && <LevelTrack from={unanswered} entry={current} />}
    </View>
  );
}

/** The four levels with the gap after the word's level filling up toward the next one */
function LevelTrack({ from, entry }: { from: WordEntry; entry: WordEntry }) {
  // Starts where the word was before the answer, then slides to where it is now, also back on Undo
  const [shown, setShown] = useState(from);
  useEffect(() => setShown(entry), [entry]);
  const level = shown.masteryLevel ?? 'Seen';
  const levelIndex = MASTERY_LEVELS.indexOf(level);
  const progress = levelProgress(level, shown.quiz);
  const hint = progressHint(level, entry.quiz, Date.now());
  return (
    <View accessible accessibilityLabel={progressLabel(level, entry.quiz) ?? `${entry.word} is ${level}`}>
      <View style={styles.track}>
        {/* Runs between the first and last dot's centers, a quarter of the width per gap */}
        <View style={styles.trackBars}>
          {MASTERY_LEVELS.slice(1).map((next, i) => {
            const fill = i < levelIndex ? 1 : i === levelIndex ? progress : 0;
            const from = getMasteryLevelColor(MASTERY_LEVELS[i]);
            const to = getMasteryLevelColor(next);
            return (
              <View key={next} style={styles.trackBar}>
                <Animated.View
                  style={[
                    styles.trackFill,
                    { transitionProperty: 'width', transitionDuration: TRACK_MS, transitionTimingFunction: 'ease-out' },
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
                  // Lights up once the bar before it has filled
                  { transitionProperty: ['backgroundColor', 'borderColor', 'transform'], transitionDuration: 250, transitionDelay: TRACK_MS },
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
const TRACK_MS = 500;

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    gap: 8,
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
  undoText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});
