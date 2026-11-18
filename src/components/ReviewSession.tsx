import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useStore } from '../store/useStore';
import { pickReviewItems, rebuildReviewQuiz, REVIEW_SIZES, type ReviewItem } from '../utils/reviewQuiz';
import type { Quiz } from '../utils/wordQuiz';
import { formatIpa } from '../utils/ipaDisplay';
import { contextTranslation } from '../utils/wordOfTheDay';
import { Text } from './Text';
import { openWordLookup } from '../navigation/navigationRef';
import PronunciationAudio from './PronunciationAudio';
import SwitchQuizButton from './SwitchQuizButton';
import WordQuiz from './WordQuiz';

interface ReviewSessionProps {
  /** A quiz for each due word (buildReviewItems) */
  dueItems: ReviewItem[];
  onClose: () => void;
  isWide?: boolean;
}

const GAP = '_____';

/** The same options in another order, so a retried word isn't answered from where it was */
function reshuffle(quiz: Quiz): Quiz {
  const order = quiz.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { options: order.map((i) => quiz.options[i]), answerIndex: order.indexOf(quiz.answerIndex) };
}

/** One quiz after another for every due word, then how many were right */
export default function ReviewSession({ dueItems, onClose, isWide }: ReviewSessionProps) {
  // Asks how many first when more words are due than the smallest session
  const [session, setSession] = useState<ReviewItem[] | null>(() =>
    dueItems.length <= REVIEW_SIZES[0] ? pickReviewItems(dueItems, dueItems.length) : null
  );
  // Words answered wrong come back once at the end, for practice that isn't saved
  const [retries, setRetries] = useState<ReviewItem[]>([]);
  const firstTries = session ?? [];
  const items = [...firstTries, ...retries];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const lookUpRef = useRef<(() => void) | null>(null);
  const isRetry = index >= firstTries.length;
  // A first try's quiz is built again when it's shown, so a word answered right earlier today, also
  // in this session, isn't one of its wrong options. A retry keeps the options it was missed with.
  const listed: ReviewItem | undefined = items[index];
  const item = useMemo(
    () => (listed && !isRetry ? { ...listed, quiz: rebuildReviewQuiz(listed, useStore.getState().words) } : listed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listed?.entry.id, isRetry, index]
  );
  const answered = answers.length > index;
  const finished = !!session && index >= items.length;
  // The score is the first tries; retries are practice
  const right = answers.slice(0, firstTries.length).filter(Boolean).length;
  const onAnswered = (correct: boolean) => {
    setAnswers((prev) => [...prev, correct]);
    if (!correct && !isRetry && item) setRetries((prev) => [...prev, { ...item, quiz: reshuffle(item.quiz) }]);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isWide && styles.cardWide]}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {!session
                ? `${dueItems.length} words due`
                : finished
                  ? 'Review done'
                  : isRetry
                    ? `Once more: ${index - firstTries.length + 1} of ${retries.length}`
                    : `Review ${index + 1} of ${firstTries.length}`}
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
                <Text style={styles.summaryText}>{`${right} of ${firstTries.length} right`}</Text>
                {retries.length > 0 && (
                  <Text style={styles.sizeHint}>
                    {`${answers.slice(firstTries.length).filter(Boolean).length} of ${retries.length} missed ${retries.length === 1 ? 'word' : 'words'} right the second time`}
                  </Text>
                )}
                <TouchableOpacity style={styles.button} onPress={onClose} accessibilityRole="button" accessibilityLabel="Done">
                  <Text style={styles.buttonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ReviewQuestion
                key={`${item.entry.id}-${isRetry}`}
                item={item}
                answered={answered}
                onAnswered={onAnswered}
                isWide={isWide}
                practice={isRetry}
                lookUpRef={lookUpRef}
                onCloseReview={onClose}
                onLookUp={(entry, line, songId, songName) => {
                  onClose();
                  openWordLookup({ word: entry.word, wordId: entry.id, songId, songName, lyricsLine: line ?? undefined, source: 'Words' });
                }}
              />
            )}
          </ScrollView>
          {session && !finished && answered && (
            <View style={styles.actions}>
              {!isRetry && (
                <TouchableOpacity
                  style={[styles.button, styles.outlineButton]}
                  onPress={() => lookUpRef.current?.()}
                  accessibilityRole="button"
                  accessibilityLabel={`Look up ${item.entry.word} to edit it`}
                >
                  <Ionicons name="search" size={16} color={Colors.primary} />
                  <Text style={styles.outlineText}>Look up</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.button, styles.nextButton]}
                onPress={() => setIndex((i) => i + 1)}
                accessibilityRole="button"
                accessibilityLabel={index + 1 < items.length ? 'Next word' : 'See results'}
              >
                <Text style={styles.buttonText}>{index + 1 < items.length ? 'Next' : 'Finish'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ReviewQuestion({
  item: askedItem,
  answered,
  onAnswered,
  isWide,
  practice,
  lookUpRef,
  onLookUp,
  onCloseReview,
}: {
  // Filled with what the Look up button beside Next opens
  lookUpRef: React.MutableRefObject<(() => void) | null>;
  onLookUp: (entry: ReviewItem['entry'], line?: string | null, songId?: string, songName?: string) => void;
  /** Closes the review, before a word in the sentences list opens its page */
  onCloseReview: () => void;
  item: ReviewItem;
  answered: boolean;
  onAnswered: (correct: boolean) => void;
  isWide?: boolean;
  practice?: boolean;
}) {
  // A listening quiz that can't be heard is asked without its recording instead
  const [noAudio, setNoAudio] = useState(false);
  const item: ReviewItem = noAudio
    ? { ...askedItem, listen: false, ipa: undefined, way: askedItem.kind === 'meaning' ? 'meaning' : 'lyric' }
    : askedItem;
  const { entry, kind, line, wordAt, hint, listen, ipa, unsaved } = item;
  const lineWord = line && wordAt ? line.slice(wordAt.start, wordAt.end) : null;
  // A line from another song the word wasn't saved from has no saved context
  const context = unsaved ? undefined : entry.contexts?.find((c) => c.context?.trim() === line);
  const songId = unsaved?.songId ?? context?.songId;
  const song = useStore((s) => (songId ? s.songs.find((x) => x.id === songId) : undefined));
  const songName = unsaved ? unsaved.songName : context?.songName || song?.songName;
  const artistName = unsaved ? unsaved.artistName : song?.artistName;
  // The translation saved with the word, or else the song's translation of the line
  const translation = line
    ? unsaved ? unsaved.translation || contextTranslation(song, line) : contextTranslation(song, line, context?.translation)
    : null;
  const updateWordEntry = useStore((s) => s.updateWordEntry);
  const [savedLine, setSavedLine] = useState(false);
  lookUpRef.current = () => onLookUp(entry, line, songId, songName);
  // Saves the other song's line as one of the word's contexts, with the meaning it was asked for
  const saveLine = () => {
    if (!unsaved || !line) return;
    const current = useStore.getState().words.find((w) => w.id === entry.id);
    if (!current) return;
    const exists = current.contexts.some((c) => c.songId === unsaved.songId && c.context?.trim() === line);
    if (!exists) {
      updateWordEntry(entry.id, {
        contexts: [
          ...current.contexts,
          {
            context: line,
            songId: unsaved.songId,
            songName: unsaved.songName,
            translation: translation || undefined,
            definition: unsaved.definition,
            partOfSpeech: unsaved.partOfSpeech,
            fromSong: true,
            occurrence: 1,
          },
        ],
      });
    }
    setSavedLine(true);
  };
  // A lyric quiz blanks the word out of the line, and shows no line it couldn't find the word in. A
  // listening quiz shows the line and meaning once answered.
  // An IPA quiz shows nothing but the IPA until it's answered.
  const showLine = !!line && (kind === 'meaning' || !!lineWord) && ((!listen && !ipa) || answered);
  // A lyric quiz fills the gap from the line's translation when there is one, else from the meaning.
  // A meaning quiz shows the translation once answered, since it would give the meaning away.
  // A spelling quiz shows the meaning once answered.
  const shownHint =
    kind === 'lyric' ? (ipa && answered ? hint : (lineWord && translation) || hint) : answered ? translation : null;
  const showHint = !!shownHint && ((!listen && !ipa) || answered);
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
      {showLine && songName ? (
        <Text style={styles.songName}>
          {artistName ? `${songName} · ${artistName}` : songName}
          {unsaved && !savedLine ? ' · not saved here yet' : ''}
        </Text>
      ) : null}
      {listen && <PronunciationAudio audio={entry.audio ?? []} autoPlay={!answered} />}
      {ipa && <Text style={styles.ipa}>{formatIpa(ipa, true)}</Text>}
      {showHint ? <Text style={styles.hint}>{shownHint}</Text> : null}
      <WordQuiz
        entry={entry}
        kind={kind}
        prompt={
          kind === 'meaning' && ipa && !answered ? (
            'What does this word mean?'
          ) : kind === 'meaning' && listen && !answered ? (
            'What does the word you heard mean?'
          ) : kind === 'meaning' ? (
            <>
              What does <Text style={styles.quizWord}>{entry.word}</Text> mean{showLine && !unsaved ? ' here' : ''}?
            </>
          ) : ipa ? (
            'Spell the word pronounced like this'
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
        practice={practice}
        typed={!!ipa && kind === 'lyric'}
        audio={!listen}
        onLookUpWord={onCloseReview}
      />
      {listen && !answered && <SwitchQuizButton onPress={() => setNoAudio(true)} />}
      {answered && !practice && unsaved && showLine && (
        <TouchableOpacity
          onPress={saveLine}
          disabled={savedLine}
          hitSlop={8}
          style={styles.lookUp}
          accessibilityRole="button"
          accessibilityLabel={savedLine ? 'Line saved' : 'Save this line'}
        >
          <Ionicons name={savedLine ? 'checkmark-circle' : 'bookmark-outline'} size={14} color={savedLine ? Colors.success : Colors.primary} />
          <Text style={[styles.lookUpText, savedLine && { color: Colors.success }]}>
            {savedLine ? `Saved this line to ${entry.word}` : `Save this line to ${entry.word}`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lookUp: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  lookUpText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
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
  ipa: {
    fontSize: 26,
    color: Colors.text,
    textAlign: 'center',
    paddingVertical: 8,
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
  actions: { flexDirection: 'row', alignSelf: 'stretch', gap: 10 },
  nextButton: {
    flex: 1,
  },
  outlineButton: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 16,
  },
  outlineText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
});
