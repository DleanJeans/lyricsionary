import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { pickReviewItems, REVIEW_SIZES, type ReviewItem } from '../utils/reviewQuiz';
import { Text } from './Text';
import PronunciationAudio from './PronunciationAudio';
import WordQuiz from './WordQuiz';

interface ReviewSessionProps {
  /** A quiz for each due word (buildReviewItems) */
  dueItems: ReviewItem[];
  onClose: () => void;
  isWide?: boolean;
}

const GAP = '_____';

/** One quiz after another for every due word, then how many were right */
export default function ReviewSession({ dueItems, onClose, isWide }: ReviewSessionProps) {
  // Asks how many first when more words are due than the smallest session
  const [session, setSession] = useState<ReviewItem[] | null>(() =>
    dueItems.length <= REVIEW_SIZES[0] ? pickReviewItems(dueItems, dueItems.length) : null
  );
  const items = session ?? [];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const item: ReviewItem | undefined = items[index];
  const answered = answers.length > index;
  const finished = !!session && index >= items.length;
  const right = answers.filter(Boolean).length;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isWide && styles.cardWide]}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {!session ? `${dueItems.length} words due` : finished ? 'Review done' : `Review ${index + 1} of ${items.length}`}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close review">
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {session && !finished && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(answers.length / items.length) * 100}%` }]} />
            </View>
          )}
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {!session ? (
              <View style={styles.summary}>
                <Text style={styles.summaryText}>How many do you want to review?</Text>
                <View style={styles.sizes}>
                  {[...REVIEW_SIZES.filter((size) => size < dueItems.length), dueItems.length].map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={styles.sizeButton}
                      onPress={() => setSession(pickReviewItems(dueItems, size))}
                      accessibilityRole="button"
                      accessibilityLabel={size === dueItems.length ? `Review all ${size}` : `Review ${size}`}
                    >
                      <Text style={styles.buttonText}>{size === dueItems.length ? `All ${size}` : size}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.sizeHint}>The words waiting longest come first</Text>
              </View>
            ) : finished ? (
              <View style={styles.summary}>
                <Ionicons name="trophy-outline" size={40} color={Colors.primaryLight} />
                <Text style={styles.summaryText}>{`${right} of ${answers.length} right`}</Text>
                <TouchableOpacity style={styles.button} onPress={onClose} accessibilityRole="button" accessibilityLabel="Done">
                  <Text style={styles.buttonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ReviewQuestion
                key={item.entry.id}
                item={item}
                answered={answered}
                onAnswered={(correct) => setAnswers((prev) => [...prev, correct])}
                isWide={isWide}
              />
            )}
          </ScrollView>
          {session && !finished && answered && (
            <TouchableOpacity
              style={[styles.button, styles.nextButton]}
              onPress={() => setIndex((i) => i + 1)}
              accessibilityRole="button"
              accessibilityLabel={index + 1 < items.length ? 'Next word' : 'See results'}
            >
              <Text style={styles.buttonText}>{index + 1 < items.length ? 'Next' : 'Finish'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ReviewQuestion({
  item,
  answered,
  onAnswered,
  isWide,
}: {
  item: ReviewItem;
  answered: boolean;
  onAnswered: (correct: boolean) => void;
  isWide?: boolean;
}) {
  const { entry, kind, line, wordAt, hint, listen } = item;
  const lineWord = line && wordAt ? line.slice(wordAt.start, wordAt.end) : null;
  const songName = entry.contexts?.find((c) => c.context?.trim() === line)?.songName;
  // A lyric quiz blanks the word out of the line, and shows no line it couldn't find the word in. A
  // listening quiz shows the line and meaning once answered.
  const showLine = !!line && (kind === 'meaning' || !!lineWord) && (!listen || answered);
  const showHint = !!hint && (!listen || answered);
  return (
    <View style={styles.question}>
      {showLine && (
        <Text style={styles.line}>
          {lineWord && wordAt ? (
            <>
              {line!.slice(0, wordAt.start)}
              {kind === 'lyric' && !answered && !listen ? (
                GAP
              ) : (
                <Text style={[styles.line, styles.lineWord, kind === 'lyric' && styles.lineAnswer]}>{lineWord}</Text>
              )}
              {line!.slice(wordAt.end)}
            </>
          ) : (
            line
          )}
        </Text>
      )}
      {showLine && songName ? <Text style={styles.songName}>{songName}</Text> : null}
      {listen && !answered && <PronunciationAudio audio={entry.audio ?? []} />}
      {showHint ? <Text style={styles.hint}>{hint}</Text> : null}
      <WordQuiz
        entry={entry}
        kind={kind}
        prompt={
          kind === 'meaning' ? (
            <>
              What does <Text style={styles.quizWord}>{entry.word}</Text> mean{showLine ? ' here' : ''}?
            </>
          ) : listen ? (
            'Which word did you hear?'
          ) : lineWord ? (
            'Which word goes in the gap?'
          ) : (
            'Which word means this?'
          )
        }
        build={() => item.quiz}
        onAnswered={onAnswered}
        isWide={isWide}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
  },
  cardWide: {
    maxWidth: 640,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceLight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  body: {
    gap: 8,
  },
  question: {
    gap: 6,
  },
  line: {
    fontSize: 18,
    color: Colors.text,
  },
  lineWord: {
    fontWeight: '700',
  },
  lineAnswer: {
    color: Colors.success,
  },
  songName: {
    fontSize: 12,
    color: Colors.textMuted,
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
  summary: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  summaryText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  sizes: {
    flexDirection: 'row',
    gap: 10,
  },
  sizeButton: {
    minWidth: 72,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  sizeHint: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  nextButton: {
    alignSelf: 'stretch',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
});
