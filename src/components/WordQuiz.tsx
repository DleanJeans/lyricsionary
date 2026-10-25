import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { useStore } from '../store/useStore';
import { MasteryLevel, WordEntry } from '../types';
import { isCoolingDown, progressLabel, Quiz, QuizKind, quizKindFor } from '../utils/wordQuiz';
import { Text } from './Text';

interface WordQuizProps {
  entry: WordEntry;
  kind: QuizKind;
  prompt: ReactNode;
  /** Builds the options once, when the quiz first shows, so saving the answer doesn't reshuffle them */
  build: () => Quiz | null;
  /** Hides a quiz not answered yet, e.g. once the line's translation has been seen */
  hidden?: boolean;
  onAnswered?: (correct: boolean) => void;
  isWide?: boolean;
}

/** A few options to pick from in the Learn word card. Remount it (key) for another word or line. */
export default function WordQuiz({ entry, kind, prompt, build, hidden = false, onAnswered, isWide }: WordQuizProps) {
  const recordQuizAnswer = useStore((s) => s.recordQuizAnswer);
  const updateWordEntry = useStore((s) => s.updateWordEntry);
  // Asked only when the quiz is for the word's level, decided once so moving up a level keeps the
  // answer on screen. A word answered correctly a few minutes ago isn't asked again, e.g. when the
  // chorus repeats it.
  const [quiz] = useState(() =>
    quizKindFor(entry.masteryLevel) !== kind || isCoolingDown(entry.quiz, Date.now()) ? null : build()
  );
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

  const progress = progressLabel(current.masteryLevel, current.quiz);

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{prompt}</Text>
      <View style={[styles.options, isWide && styles.optionsWide]}>
        {quiz.options.map((option, index) => {
          const isAnswer = index === quiz.answerIndex;
          const state = !answered ? null : isAnswer ? 'right' : index === chosen ? 'wrong' : 'other';
          return (
            <TouchableOpacity
              key={`${index}-${option}`}
              style={[
                styles.option,
                isWide && styles.optionWide,
                state === 'right' && styles.optionRight,
                state === 'wrong' && styles.optionWrong,
                state === 'other' && styles.optionOther,
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
            <Text style={styles.resultText}>
              {correct ? 'Right! ' : 'Not quite. '}
              {progress}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

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
  optionOther: {
    opacity: 0.5,
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
  undoText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});
