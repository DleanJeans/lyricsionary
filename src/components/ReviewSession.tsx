import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFlagForLanguage, getLanguageNameFromCode } from '../constants/languages';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { useStore } from '../store/useStore';
import { buildTypeItems, MORE_REVIEW_SIZE, pauseSpeakingQuizzes, QUIZ_TYPES, pickReviewItems, rebuildReviewQuiz, reviewIpa, REVIEW_SIZES, type ReviewItem } from '../utils/reviewQuiz';
import type { Quiz } from '../utils/wordQuiz';
import { formatIpa } from '../utils/ipaDisplay';
import { contextTranslation } from '../utils/wordOfTheDay';
import { Text } from './Text';
import { openSongAtLine, openWordLookup } from '../navigation/navigationRef';
import { setReviewResume } from '../navigation/reviewResume';
import PlayLineButton from './PlayLineButton';
import PronunciationAudio from './PronunciationAudio';
import SwitchQuizButton from './SwitchQuizButton';
import WordQuiz, { AnswerAudio } from './WordQuiz';
import { MASTERY_LEVELS, type WordEntry } from '../types';
import { dueCountAt } from '../utils/reviewReminder';
import { cefrProgress } from '../utils/cefr';
import { CefrMiniBar, CefrPill, toNextLabel } from './CefrLevel';

interface ReviewSessionProps {
  /** A quiz for each due word (buildReviewItems) */
  dueItems: ReviewItem[];
  onClose: () => void;
  isWide?: boolean;
  /** Starts a session of this many right away, without asking (a daily batch); the rest of dueItems is for more */
  startSize?: number;
  /** Every word due in each language, when dueItems is only a part of them (the launch review) */
  dueTotals?: Record<string, number>;
  /** With dueTotals: the review of one language, built when it's picked (the launch review) */
  buildForLanguage?: (language: string) => ReviewItem[];
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

/** The languages of the items, the one of the most recently opened song first */
function languagesByRecency(codes: string[]): string[] {
  const rank = new Map<string, number>();
  for (const song of useStore.getState().songs) {
    const lang = song.originalLanguages?.[0];
    if (lang) rank.set(lang, Math.max(rank.get(lang) ?? 0, song.lastOpenedAt ?? 0));
  }
  const recency = (lang: string) => rank.get(lang) ?? rank.get(getLanguageNameFromCode(lang) ?? '') ?? 0;
  return [...new Set(codes)].sort((a, b) => recency(b) - recency(a));
}

/** Asks which language to review first when the due words are in more than one, then the session */
export default function ReviewSession(props: ReviewSessionProps) {
  const byLanguage = !!props.buildForLanguage && !!props.dueTotals;
  const languages = useMemo(
    () => languagesByRecency(byLanguage ? Object.keys(props.dueTotals!) : props.dueItems.map((i) => i.entry.language)),
    [props.dueItems, props.dueTotals, byLanguage]
  );
  const [built, setBuilt] = useState<ReviewItem[] | null>(null);
  // Each language's CEFR level, shown beside its due count
  const allWords = useStore((s) => s.words);
  const levels = useMemo(() => Object.fromEntries(languages.map((l) => [l, cefrProgress(allWords, l)])), [languages, allWords]);
  const [language, setLanguage] = useState<string | null>(languages.length > 1 ? null : (languages[0] ?? ''));
  const insets = useSafeAreaInsets();
  if (language !== null && byLanguage && languages.length > 1) {
    const items = built ?? [];
    return <LanguageReview {...props} dueItems={items} startSize={items.length} />;
  }
  if (language !== null) {
    const items = languages.length > 1 ? props.dueItems.filter((i) => i.entry.language === language) : props.dueItems;
    return <LanguageReview {...props} dueItems={items} startSize={languages.length > 1 ? undefined : props.startSize} />;
  }
  return (
    <Modal visible transparent animationType="fade" onRequestClose={props.onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, props.isWide && styles.cardWide]}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose a language to review</Text>
            <TouchableOpacity onPress={props.onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close review">
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.languageScroll} contentContainerStyle={[styles.languages, { paddingBottom: 16 + insets.bottom }]}>
            {languages.map((lang) => {
              const count = props.dueTotals?.[lang] ?? props.dueItems.filter((i) => i.entry.language === lang).length;
              const name = getLanguageNameFromCode(lang) ?? lang;
              return (
                <TouchableOpacity
                  key={lang}
                  style={styles.languageRow}
                  onPress={() => {
                    if (byLanguage) setBuilt(props.buildForLanguage!(lang));
                    setLanguage(lang);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Review ${name}, ${count} due`}
                >
                  <Text style={styles.languageFlag}>{getFlagForLanguage(lang)}</Text>
                  <View style={styles.languageInfo}>
                    <View style={styles.languageTop}>
                      <Text style={styles.languageNameText} numberOfLines={1}>{name}</Text>
                      <CefrPill level={levels[lang].level} small />
                      <Text style={styles.dueCount}>{`${count} due`}</Text>
                    </View>
                    <CefrMiniBar progress={levels[lang]} />
                    <Text style={styles.sizeHint}>{`${toNextLabel(levels[lang])} · ${levels[lang].mastered.toLocaleString('en-US')} words known`}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** One quiz after another for every due word, then how many were right */
function LanguageReview({ dueItems, onClose, isWide, startSize }: ReviewSessionProps) {
  // Asks how many first when more words are due than the smallest session
  const [session, setSession] = useState<ReviewItem[] | null>(() =>
    startSize
      ? pickReviewItems(dueItems, startSize)
      : dueItems.length <= REVIEW_SIZES[0]
        ? pickReviewItems(dueItems, dueItems.length)
        : null
  );
  const insets = useSafeAreaInsets();
  const words = useStore((s) => s.words);
  // Trying one quiz type: a round of 5 words that counts like any review
  const [typePicker, setTypePicker] = useState(false);
  const [typeCount, setTypeCount] = useState(1);
  const [typeNote, setTypeNote] = useState<string | null>(null);
  const language = dueItems[0]?.entry.language ?? session?.[0]?.entry.language;
  const tryType = (type: (typeof QUIZ_TYPES)[number]) => {
    const picked = buildTypeItems(type, language!, words, useStore.getState().songs, typeCount);
    if (!picked.length) return setTypeNote(`No ${getLanguageNameFromCode(language!) ?? language} words suit "${type.label}" yet`);
    setTypeNote(null);
    setTypePicker(false);
    setRetries([]);
    setIndex(0);
    setAnswers([]);
    setSession(picked);
  };
  // The levels the words had when the review opened, to count how many moved
  const startLevels = useRef<Map<string, number> | null>(null);
  if (!startLevels.current) {
    startLevels.current = new Map(dueItems.map((d) => [d.entry.id, MASTERY_LEVELS.indexOf(d.entry.masteryLevel ?? 'Seen')]));
  }
  // Words from earlier sessions of this review, which "more" skips
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const remaining = dueItems.filter((d) => !doneIds.has(d.entry.id) && !session?.some((s) => s.entry.id === d.entry.id));
  const startMore = () => {
    const next = pickReviewItems(remaining, MORE_REVIEW_SIZE);
    setDoneIds((prev) => new Set([...prev, ...(session ?? []).map((s) => s.entry.id)]));
    setSession(next);
    setRetries([]);
    setIndex(0);
    setAnswers([]);
  };
  // Words answered wrong come back once at the end, for practice that isn't saved
  const [retries, setRetries] = useState<ReviewItem[]>([]);
  const firstTries = session ?? [];
  const items = [...firstTries, ...retries];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const lookUpRef = useRef<(() => void) | null>(null);
  // Hidden, not closed, while a Look Up page is open, so Back finds the quiz as it was
  const [hidden, setHidden] = useState(false);
  const stepAside = () => {
    setReviewResume(() => setHidden(false));
    setHidden(true);
  };
  useEffect(() => () => setReviewResume(null), []);
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
  const levelChanges = useMemo(() => {
    if (!finished) return { up: 0, down: 0 };
    let up = 0;
    let down = 0;
    for (const w of words) {
      const before = startLevels.current?.get(w.id);
      if (before === undefined) continue;
      const now = MASTERY_LEVELS.indexOf(w.masteryLevel ?? 'Seen');
      if (now > before) up++;
      else if (now < before) down++;
    }
    return { up, down };
  }, [finished, words]);
  // Every word due in any language, as the review reminder counts them
  const dueLeft = useMemo(() => (finished ? dueCountAt(words, Date.now()) : 0), [finished, words]);
  const onAnswered = (correct: boolean) => {
    setAnswers((prev) => [...prev, correct]);
    if (!correct && !isRetry && item) setRetries((prev) => [...prev, { ...item, quiz: reshuffle(item.quiz) }]);
  };

  return (
    <Modal visible={!hidden} transparent animationType="fade" onRequestClose={onClose}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              {!!language && !typePicker && (
                <TouchableOpacity onPress={() => setTypePicker(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Try a quiz type">
                  <Ionicons name="apps-outline" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close review">
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          {typePicker && (
            <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 16 + insets.bottom }]}>
              <Text style={styles.summaryText}>Try a quiz type</Text>
              <Text style={[styles.sizeHint, { textAlign: 'center' }]}>{`${getFlagForLanguage(language!)} ${getLanguageNameFromCode(language!) ?? language}`}</Text>
              <View style={{ flexDirection: 'row', alignSelf: 'center', borderWidth: 1, borderColor: Colors.primary, borderRadius: 10, overflow: 'hidden' }}>
                {[1, 3, 5, 10].map((n, i) => (
                  <TouchableOpacity
                    key={n}
                    style={{ minWidth: 52, paddingVertical: 8, alignItems: 'center', backgroundColor: n === typeCount ? Colors.primary : 'transparent', borderLeftWidth: i ? 1 : 0, borderLeftColor: Colors.primary }}
                    onPress={() => setTypeCount(n)}
                    accessibilityRole="button"
                    accessibilityLabel={`${n} ${n === 1 ? 'word' : 'words'}`}
                  >
                    <Text style={n === typeCount ? styles.buttonText : styles.outlineText}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {QUIZ_TYPES.map((type) => (
                <TouchableOpacity key={type.id} style={styles.languageRow} onPress={() => tryType(type)} accessibilityRole="button" accessibilityLabel={type.label}>
                  <Ionicons name={type.icon as any} size={22} color={Colors.primaryLight} />
                  <View style={styles.languageInfo}>
                    <Text style={styles.languageNameText}>{type.label}</Text>
                    <Text style={styles.sizeHint}>{type.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
              {typeNote ? <Text style={styles.sizeHint}>{typeNote}</Text> : null}
              <TouchableOpacity style={[styles.button, styles.outlineButton]} onPress={() => setTypePicker(false)} accessibilityRole="button" accessibilityLabel="Back">
                <Text style={styles.outlineText}>Back</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
          {session && !finished && !typePicker && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(answers.length / items.length) * 100}%` }]} />
            </View>
          )}
          <ScrollView style={typePicker ? { display: 'none' } : undefined} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
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
              <View style={[styles.summary, { paddingBottom: 16 + insets.bottom }]}>
                <Ionicons name="trophy-outline" size={40} color={Colors.primaryLight} />
                <Text style={styles.summaryText}>{`${right} of ${firstTries.length} right`}</Text>
                {retries.length > 0 && (
                  <Text style={styles.sizeHint}>
                    {`${answers.slice(firstTries.length).filter(Boolean).length} of ${retries.length} missed ${retries.length === 1 ? 'word' : 'words'} right the second time`}
                  </Text>
                )}
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Ionicons name="trending-up" size={18} color={Colors.primaryLight} />
                    <Text style={styles.statText}>{`${levelChanges.up} leveled up`}</Text>
                  </View>
                  {levelChanges.down > 0 && (
                    <View style={styles.stat}>
                      <Ionicons name="trending-down" size={18} color={Colors.textSecondary} />
                      <Text style={styles.statText}>{`${levelChanges.down} dropped`}</Text>
                    </View>
                  )}
                  <View style={styles.stat}>
                    <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
                    <Text style={styles.statText}>{`${dueLeft} due left`}</Text>
                  </View>
                </View>
                {remaining.length > 0 && (
                  <TouchableOpacity
                    style={[styles.button, styles.moreButton]}
                    onPress={startMore}
                    accessibilityRole="button"
                    accessibilityLabel={`${Math.min(MORE_REVIEW_SIZE, remaining.length)} more`}
                  >
                    <Ionicons name="add" size={18} color={Colors.white} />
                    <Text style={styles.buttonText}>{`${Math.min(MORE_REVIEW_SIZE, remaining.length)} more`}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={remaining.length > 0 ? [styles.button, styles.outlineButton] : styles.button}
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                >
                  <Text style={remaining.length > 0 ? styles.outlineText : styles.buttonText}>Done</Text>
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
                onCloseReview={stepAside}
                onLookUp={(entry, line, songId, songName) => {
                  stepAside();
                  openWordLookup({ word: entry.word, wordId: entry.id, songId, songName, lyricsLine: line ?? undefined, source: 'Words' });
                }}
              />
            )}
          </ScrollView>
          {session && !finished && answered && !typePicker && (
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
    ? { ...askedItem, listen: false, speak: false, ipa: undefined, way: askedItem.kind === 'meaning' ? 'meaning' : 'lyric' }
    : askedItem;
  const { entry, kind, line, wordAt, hint, listen, ipa, speak, unsaved } = item;
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
  // Saying a word is asked with its IPA, as there's no spelling to go by, unless it's tried from the quiz types list
  const speakIpa = speak && kind === 'meaning' && !item.forced ? reviewIpa(entry, context) : undefined;
  lookUpRef.current = () => onLookUp(entry, line, songId, songName);
  // The word card's IPA and meaning once answered
  const answerIpa = ipa ?? reviewIpa(entry, context);
  const meaning = item.target?.answer ?? context?.definition ?? unsaved?.definition ?? (kind === 'meaning' ? item.quiz.options[item.quiz.answerIndex] : undefined);
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
  const showHint = !!shownHint && ((!listen && !ipa) || answered) && !(item.noTranslation && !answered);
  return (
    <View style={styles.question}>
      {showLine && !answered && (
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
      {showLine && songName && !answered ? (
        <View style={styles.songRow}>
          <Text style={[styles.songName, { flexShrink: 1 }]}>
            {artistName ? `${songName} · ${artistName}` : songName}
            {unsaved && !savedLine ? ' · not saved here yet' : ''}
          </Text>
          {line ? <PlayLineButton song={song} line={line} size={18} /> : null}
          {songId && line ? (
            <TouchableOpacity
              hitSlop={10}
              onPress={() => {
                onCloseReview();
                openSongAtLine(songId, { word: entry.word, line, occurrence: context?.occurrence });
              }}
              accessibilityRole="button"
              accessibilityLabel={`Open ${songName} at this line`}
            >
              <Ionicons name="open-outline" size={18} color={Colors.primaryLight} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {listen && !answered && <PronunciationAudio audio={entry.audio ?? []} wordId={entry.id} autoPlay />}
      {speak && kind === 'meaning' && !answered && <PronunciationAudio audio={entry.audio ?? []} wordId={entry.id} />}
      {speakIpa && !answered && <Text style={styles.ipa}>{formatIpa(speakIpa, true)}</Text>}
      {ipa && !answered && <Text style={styles.ipa}>{formatIpa(ipa, true)}</Text>}
      {showHint && !answered ? <Text style={styles.hint}>{shownHint}</Text> : null}
      <WordQuiz
        // Remounted for the swapped quiz, so how it's answered (typed or picked) is decided again
        key={noAudio ? 'swapped' : 'asked'}
        entry={entry}
        kind={kind}
        prompt={
          speak ? (
            kind === 'meaning' ? (
              <>
                Say <Text style={styles.quizWord}>{entry.word}</Text> out loud
              </>
            ) : lineWord ? (
              'Say the word that goes in the gap'
            ) : (
              'Say the word that means this'
            )
          ) : kind === 'meaning' && ipa && !answered ? (
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
        spoken={speak}
        force={item.forced}
        noHint={item.noTranslation}
        ipaShown={!!speakIpa || !!ipa}
        audio={!listen}
        onLookUpWord={onCloseReview}
        missedNote="Again at the end"
        renderAnswered={(current, correct) => (
          <>
            <AnsweredWordCard entry={current} ipa={answerIpa} meaning={meaning} autoPlay={correct} />
            {line ? (
              <View style={styles.lineCard}>
                <Text style={styles.cardLine}>
                  {lineWord && wordAt ? (
                    <>
                      {line.slice(0, wordAt.start)}
                      <Text style={[styles.cardLine, styles.lineWord, styles.lineAnswer]}>{lineWord}</Text>
                      {line.slice(wordAt.end)}
                    </>
                  ) : (
                    line
                  )}
                </Text>
                {translation ? <Text style={styles.cardTranslation}>{translation}</Text> : null}
                <View style={styles.songRow}>
                  <Text style={[styles.songName, { flex: 1 }]} numberOfLines={2}>
                    {songName ? (artistName ? `${songName} · ${artistName}` : songName) : ''}
                  </Text>
                  {!practice && unsaved && (
                    <TouchableOpacity
                      onPress={saveLine}
                      disabled={savedLine}
                      hitSlop={6}
                      style={styles.iconButton}
                      accessibilityRole="button"
                      accessibilityLabel={savedLine ? `Saved this line to ${entry.word}` : `Save this line to ${entry.word}`}
                    >
                      <Ionicons name={savedLine ? 'checkmark-circle' : 'bookmark-outline'} size={15} color={savedLine ? Colors.success : Colors.primaryLight} />
                      <Text style={[styles.iconButtonText, savedLine && { color: Colors.success }]}>{savedLine ? 'Saved' : 'Save'}</Text>
                    </TouchableOpacity>
                  )}
                  <PlayLineButton song={song} line={line} style={styles.iconButton} />
                  {songId ? (
                    <TouchableOpacity
                      hitSlop={6}
                      style={styles.iconButton}
                      onPress={() => {
                        onCloseReview();
                        openSongAtLine(songId, { word: entry.word, line, occurrence: context?.occurrence });
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${songName} at this line`}
                    >
                      <Ionicons name="open-outline" size={15} color={Colors.primaryLight} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : null}
          </>
        )}
      />
      {listen && !answered && <SwitchQuizButton onPress={() => setNoAudio(true)} />}
      {speak && !answered && <SwitchQuizButton label="Can't use the mic? Try another quiz" onPress={() => { pauseSpeakingQuizzes(); if (Platform.OS === 'android') ToastAndroid.show('Voice quiz paused for 5 minutes', ToastAndroid.SHORT); setNoAudio(true); }} />}
    </View>
  );
}

/** The word once answered: its level, recordings, IPA and meaning */
function AnsweredWordCard({ entry, ipa, meaning, autoPlay = false }: { entry: WordEntry; ipa?: string; meaning?: string; autoPlay?: boolean }) {
  const level = entry.masteryLevel ?? 'Seen';
  return (
    <View style={styles.wordCard}>
      <View style={styles.wordCardTop}>
        <View style={[styles.levelChip, { backgroundColor: getMasteryLevelColor(level) }]}>
          <Text style={styles.levelChipText}>{level.toUpperCase()}</Text>
        </View>
        <View style={{ marginLeft: 'auto' }}>
          <AnswerAudio entry={entry} collapsed autoPlay={autoPlay} />
        </View>
      </View>
      <View style={styles.wordRow}>
        <Text style={styles.cardWord}>{entry.word}</Text>
        {ipa ? <Text style={styles.cardIpa}>{formatIpa(ipa, true)}</Text> : null}
      </View>
      {meaning ? <Text style={styles.cardMeaning}>{meaning}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wordCard: { backgroundColor: Colors.surfaceLight, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 12, gap: 6 },
  wordCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 26 },
  levelChip: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  levelChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4, color: Colors.background },
  wordRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 10 },
  cardWord: { fontSize: 24, fontWeight: '700', color: Colors.text },
  cardIpa: { fontSize: 15, color: Colors.textSecondary },
  cardMeaning: { fontSize: 15, color: Colors.text },
  lineCard: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 12, gap: 6 },
  cardLine: { fontSize: 16, color: Colors.text, lineHeight: 22 },
  cardTranslation: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' },
  iconButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: Colors.border, borderRadius: 9, paddingHorizontal: 8, height: 30, justifyContent: 'center', minWidth: 30 },
  iconButtonText: { fontSize: 12, fontWeight: '600', color: Colors.primaryLight },
  songRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: Colors.textSecondary,
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
  moreButton: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  sizes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
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
  // Many languages scroll inside the dialog instead of running off the screen
  languageScroll: { flexShrink: 1 },
  languages: { gap: 8, paddingTop: 8 },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  languageFlag: { fontSize: 22 },
  languageName: { flex: 1, fontSize: 16, color: Colors.text },
  languageInfo: { flex: 1, gap: 8 },
  languageTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  languageNameText: { fontSize: 16, color: Colors.text, flexShrink: 1 },
  dueCount: { marginLeft: 'auto', fontSize: 13, color: Colors.textSecondary },
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
