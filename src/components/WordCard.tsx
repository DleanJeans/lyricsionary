import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View, Text as RNText } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { getFlagForLanguage } from '../constants/languages';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { useWiktionaryPronunciation } from '../hooks/useWiktionaryPronunciation';
import { useStore } from '../store/useStore';
import { WordEntry } from '../types';
import { prepareEmojiSuggestions } from '../utils/emojiSuggestion';
import { splitIpas } from '../utils/ipaList';
import { findSearchMatches } from '../utils/search';
import { nextDueAt } from '../utils/wordQuiz';
import { emojisByCategory } from 'rn-emoji-keyboard';
import { isGermanLanguage } from '../utils/compoundWords';
import AlsoInSongs from './AlsoInSongs';
import WordTransformButtons from './WordTransformButtons';
import CompoundSplitEditor, { SplitButton, useCompoundSplit } from './CompoundSplitEditor';
import QuickNote from './QuickNote';
import DueLabel from './DueLabel';
import MasteryLevelBadge from './MasteryLevelBadge';
import MasteryLevelSelector from './MasteryLevelSelector';
import SavedPill from './SavedPill';
import HighlightedText from './HighlightedText';
import HoldToDeleteButton from './HoldToDeleteButton';
import PronunciationAudio from './PronunciationAudio';
import { Text } from './Text';

interface WordCardProps {
  item: WordEntry;
  isWide?: boolean;
  searchQuery?: string;
  showDelete?: boolean;
  showClose?: boolean;
  onClose?: () => void;
  onDelete?: (item: WordEntry, close: () => void) => void;
  source?: 'Learn' | 'Words';
  songId?: string;
  songName?: string;
  artistName?: string;
  lyricsLine?: string;
  translationLine?: string;
  originalLanguages?: string[];
  occurrence?: number;
  /** Shown under the word in Learn, e.g. a quiz on its meaning */
  quiz?: React.ReactNode;
  /** Learn: unsaves the word from the level picker */
  onRemove?: (item: WordEntry) => void;
  /** Learn: unsaves the word and ignores it, as the new word card's Ignore button does */
  onIgnore?: (item: WordEntry) => void;
  /** Learn: the word was just saved from a tap, so its card shows Saved for a moment */
  justSaved?: boolean;
  /** Learn: the word's quiz is waiting for an answer, so Also in hides its lines' translations */
  quizPending?: boolean;
  /** Learn: the quiz shows its result, with the next quiz time on its row instead of above it */
  quizAnswered?: boolean;
  /** Learn on a phone: the card sits in a sheet under the lyrics, so it drops its own box, keeps the
   * audio beside the word and folds Also in to one line */
  inSheet?: boolean;
  /** Words: show the lyric line the word was saved from, with its song */
  showLyricLine?: boolean;
}

export default function WordCard({
  item,
  isWide = false,
  searchQuery = '',
  showDelete = true,
  showClose = false,
  onClose,
  onDelete,
  source,
  songId,
  songName,
  artistName,
  lyricsLine,
  translationLine,
  originalLanguages,
  occurrence,
  quiz,
  onRemove,
  onIgnore,
  justSaved = false,
  quizPending = false,
  quizAnswered = false,
  inSheet = false,
  showLyricLine = true,
}: WordCardProps) {
  const navigation = useNavigation<any>();
  const addOrUpdateWord = useStore((s) => s.addOrUpdateWord);
  const autoPlayAudio = useStore((s) => s.autoPlayAudio) && showClose;
  // Learn: the level badge opens a level picker, to change it without opening the word
  const [choosingLevel, setChoosingLevel] = useState(false);
  useEffect(() => setChoosingLevel(false), [item.id]);
  const swipeableRef = useRef<Swipeable>(null);
  // Learn: a German word can be split into its parts by hand
  const split = useCompoundSplit(item.word, showClose && isGermanLanguage([item.language]));
  // Only the Learn screen's card for the selected word, not every card in the Words list
  const wiktionary = useWiktionaryPronunciation(item.word, item.language, {
    enabled: showClose,
    savedAudio: item.audio,
    needsIpa: !item.pronunciation,
  });
  // Look up opens without first reading every emoji's name for its suggestions
  useEffect(() => {
    if (!showClose) return;
    const timer = setTimeout(() => prepareEmojiSuggestions(emojisByCategory), 500);
    return () => clearTimeout(timer);
  }, [showClose]);
  // Words saved before recordings were kept get them the first time they're selected
  const setWordAudio = useStore((s) => s.setWordAudio);
  useEffect(() => {
    if (showClose && !item.audio && wiktionary.loaded) setWordAudio(item.id, wiktionary.audio);
  }, [showClose, item.id, item.audio, wiktionary.loaded, wiktionary.audio, setWordAudio]);
  // Wiktionary's IPA until the word has one of its own
  const ipa = item.pronunciation
    ? (item.pronunciation.includes('/') ? item.pronunciation : `/${item.pronunciation}/`)
    : wiktionary.ipa.join(', ');
  // The emoji of the selected line's context in Learn, otherwise the first context's
  const context =
    item.contexts?.find((c) => c.songId === songId && c.context === lyricsLine && (c.occurrence || 1) === (occurrence || 1)) ??
    item.contexts?.find((c) => c.songId === songId && c.context === lyricsLine) ??
    // Words: the first one from a song, for the lyric line on its card
    (showClose ? undefined : item.contexts?.find((c) => c.songId && c.context?.trim())) ??
    item.contexts?.[0];
  const contextArtist = useStore((s) => (showClose || !context?.songId ? undefined : s.songs.find((song) => song.id === context.songId)?.artistName));
  const flag = context?.emoji || item.emoji || getFlagForLanguage(item.language);

  const handleCardPress = () => {
    navigation.navigate('WordLookup', {
      word: item.word,
      wordId: item.id,
      songId,
      songName,
      artistName,
      lyricsLine,
      translationLine,
      originalLanguages,
      source,
      occurrence,
    });
  };

  const renderDeleteActions = () => {
    if (!showDelete) return null;
    return (
      <HoldToDeleteButton
        accessibilityLabel={`Delete ${item.word}`}
        onDelete={() => onDelete?.(item, () => swipeableRef.current?.close())}
      />
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderDeleteActions}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[styles.card, !showClose && styles.cardWords, isWide && styles.cardWide, inSheet && styles.cardInSheet]}
        // Learn's card opens Look Up only from its Look up button, so a stray tap doesn't leave the song
        onPress={showClose ? undefined : handleCardPress}
        activeOpacity={1}
        accessibilityRole={showClose ? undefined : 'button'}
        accessibilityLabel={showClose ? undefined : `Open ${item.word}`}
      >
        {showClose ? (
          // Learn screen: same layout as the new word card
          <>
            <View style={styles.header}>
              {/* Level, word and IPA share a row; a long word wraps and its IPA follows it */}
              <View style={styles.title}>
                <MasteryLevelBadge level={item.masteryLevel} open={choosingLevel} onPress={() => setChoosingLevel((v) => !v)} />
                {/* The IPA sits inside the word's text so they share a baseline */}
                <Text style={styles.titleWordText}>
                  {item.word}
                  {ipa ? <RNText style={styles.ipaInline}>{`  ${ipa}`}</RNText> : null}
                </Text>
                {inSheet && wiktionary.audio.length > 0 && <PronunciationAudio audio={wiktionary.audio} compact short autoPlay={autoPlayAudio} />}
                {justSaved && <SavedPill />}
              </View>
              <View style={styles.headerTools}>
                {showClose && isGermanLanguage([item.language]) && !split.editing && (
                  <SplitButton style={styles.toolButton} onPress={split.start} />
                )}
                {onIgnore && (
                  <TouchableOpacity
                    onPress={() => onIgnore(item)}
                    style={styles.toolButton}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel="Ignore Word"
                  >
                    <Ionicons name="eye-off-outline" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.toolButton}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={`Close ${item.word}`}
                >
                  <Ionicons name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            {!inSheet && wiktionary.audio.length > 0 && (
              <View style={styles.ipaRow}>
                <PronunciationAudio audio={wiktionary.audio} compact short autoPlay={autoPlayAudio} />
              </View>
            )}
            {choosingLevel && (
              <View style={styles.levelPicker}>
                <MasteryLevelSelector
                  value={item.masteryLevel || 'Seen'}
                  onChange={(level) => {
                    setChoosingLevel(false);
                    void addOrUpdateWord(item.word, item.language, undefined, undefined, level);
                  }}
                  onRemove={onRemove && (() => onRemove(item))}
                />
              </View>
            )}
            {split.parts && !split.editing && (
              <Text style={styles.compoundText}>{split.parts.map((p) => p.text).join(' · ')}</Text>
            )}
            {split.editing && <CompoundSplitEditor word={item.word} split={split} />}
            {!quizAnswered && <DueLabel entry={item} />}
            <QuickNote entry={item} />
            {quiz}
            {/* Not while the quiz waits for an answer, since Look Up would give it away */}
            {!quizPending && (
              <TouchableOpacity
                style={styles.lookUpButton}
                onPress={handleCardPress}
                accessibilityRole="button"
                accessibilityLabel={`Look up ${item.word}`}
              >
                <Ionicons name="search" size={16} color={Colors.white} />
                <Text style={styles.lookUpText}>Look up</Text>
              </TouchableOpacity>
            )}
            {/* A split compound's parts to look up on their own, e.g. Falsch and parker */}
            {!quizPending && !split.editing && split.parts && (
              <WordTransformButtons
                word={item.word}
                language={item.language}
                songId={songId}
                songName={songName}
                artistName={artistName}
                lyricsLine={lyricsLine}
                translationLine={translationLine}
                originalLanguages={originalLanguages}
                source="Learn"
                occurrence={occurrence}
                hideOriginalWord
                compact
                extraWords={split.parts.map((p) => p.lookup)}
              />
            )}
            <AlsoInSongs item={item} songId={songId} hideTranslations={quizPending} folded={inSheet} />
          </>
        ) : (
          <WordsCardContent
            item={item}
            flag={flag}
            context={context}
            artistName={contextArtist}
            searchQuery={searchQuery}
            showLyricLine={showLyricLine}
          />
        )}
      </TouchableOpacity>
    </Swipeable>
  );
}

/** "Due", "5h", "tomorrow" or "in 3 days" for a word's next quiz; "Known" once it has none */
function shortDue(item: WordEntry, now: number): { text: string; due: boolean } | null {
  const dueAt = nextDueAt(item, now);
  if (dueAt === null) return item.masteryLevel === 'Known' ? { text: 'Known', due: false } : null;
  if (dueAt <= now) return { text: 'Due', due: true };
  const hours = Math.ceil((dueAt - now) / (60 * 60 * 1000));
  if (hours < 12) return { text: `in ${hours}h`, due: false };
  const startOf = (t: number) => new Date(t).setHours(0, 0, 0, 0);
  const days = Math.round((startOf(dueAt) - startOf(now)) / (24 * 60 * 60 * 1000));
  if (days <= 0) return { text: `in ${hours}h`, due: false };
  return { text: days === 1 ? 'tomorrow' : `in ${days} days`, due: false };
}

interface WordsCardContentProps {
  item: WordEntry;
  flag: string;
  context: WordEntry['contexts'][number] | undefined;
  artistName: string | undefined;
  searchQuery: string;
  showLyricLine: boolean;
}

/** A saved word in the Words list: word, IPA and next quiz; level, meaning and type; then its lyric line */
function WordsCardContent({ item, flag, context, artistName, searchQuery, showLyricLine }: WordsCardContentProps) {
  const ipas = splitIpas(item.pronunciation);
  const ipa = ipas[0] ? (ipas[0].includes('/') || ipas[0].includes('[') ? ipas[0] : `/${ipas[0]}/`) : '';
  const level = item.masteryLevel || 'Seen';
  const meaning = context?.definition || item.contexts?.find((c) => c.definition)?.definition || item.definitions?.[0]?.text;
  const partOfSpeech = context?.partOfSpeech ?? item.contexts?.find((c) => c.partOfSpeech)?.partOfSpeech;
  const due = shortDue(item, Date.now());
  const line = context?.context?.trim();
  // The word in its line: as saved, else one of its merged forms, e.g. jag for jagen
  const lineWord = line ? [item.word, ...(item.forms ?? [])].find((w) => findSearchMatches(line, w).length > 0) : undefined;
  return (
    <View>
      <View style={styles.wordsTop}>
        <Text style={styles.wordsEmoji}>{flag}</Text>
        <HighlightedText text={item.word} query={searchQuery} style={styles.wordsWord} numberOfLines={1} />
        {!!ipa && <HighlightedText text={ipa} query={searchQuery} style={styles.wordsIpa} numberOfLines={1} />}
        {ipas.length > 1 && (
          <View style={styles.moreChip} accessibilityLabel={`${ipas.length - 1} more IPA`}>
            <Text style={styles.moreChipText}>+{ipas.length - 1}</Text>
          </View>
        )}
        {due && <Text style={[styles.wordsDue, due.due && styles.wordsDueNow]}>{due.text}</Text>}
      </View>
      <View style={styles.wordsMeaningRow}>
        <View style={styles.levelPill}>
          <View style={[styles.levelDot, { backgroundColor: getMasteryLevelColor(level) }]} />
          <Text style={styles.levelPillText}>{level}</Text>
        </View>
        {!!meaning && <HighlightedText text={meaning} query={searchQuery} style={styles.wordsMeaning} numberOfLines={1} />}
        {!!partOfSpeech && <Text style={styles.wordsPos}>{partOfSpeech}</Text>}
        {!!item.forms?.length && (
          <View style={styles.formsChip} accessibilityLabel={`Also ${item.forms.join(', ')}`}>
            <Text style={styles.formsChipText}>+{item.forms.length} {item.forms.length === 1 ? 'form' : 'forms'}</Text>
          </View>
        )}
      </View>
      {showLyricLine && !!line && (
        <View style={styles.wordsLine}>
          <HighlightedText
            text={line}
            query={lineWord ?? ''}
            style={styles.wordsLineText}
            highlightStyle={styles.wordsLineWord}
            numberOfLines={2}
          />
          {!!context?.songName && (
            <View style={styles.wordsSongRow}>
              <Ionicons name="musical-note" size={11} color={Colors.textMuted} />
              <Text style={styles.wordsSong} numberOfLines={1}>
                {context.songName}{artistName ? ` · ${artistName}` : ''}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const webWordBreak = Platform.OS === 'web' ? ({ wordBreak: 'break-word' } as object) : {};

const styles = StyleSheet.create({
  wordsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordsEmoji: {
    fontSize: 18,
  },
  wordsWord: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  wordsIpa: {
    flexShrink: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  moreChip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(108,92,231,0.18)',
  },
  moreChipText: {
    fontSize: 10.5,
    color: Colors.primaryLight,
  },
  wordsDue: {
    marginLeft: 'auto',
    paddingLeft: 6,
    fontSize: 11.5,
    color: Colors.textMuted,
  },
  wordsDueNow: {
    color: Colors.warning,
    fontWeight: '700',
  },
  wordsMeaningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  levelDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  levelPillText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  wordsMeaning: {
    flexShrink: 1,
    fontSize: 14,
    color: '#D9D9E8',
  },
  wordsPos: {
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.textMuted,
  },
  wordsLine: {
    marginTop: 7,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: Colors.border,
  },
  wordsLineText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  wordsLineWord: {
    color: Colors.primaryLight,
    fontWeight: '700',
  },
  wordsSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  wordsSong: {
    flexShrink: 1,
    fontSize: 11,
    color: Colors.textMuted,
  },
  lookUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    backgroundColor: Colors.primary,
  },
  lookUpText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardWords: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  cardWide: {
    flex: 1,
  },
  cardInSheet: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    paddingTop: 0,
    paddingBottom: 4,
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 8,
    rowGap: 8,
  },
  levelPicker: {
    marginTop: 10,
  },
  titleWordText: {
    ...webWordBreak,
    flexShrink: 1,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  headerTools: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -6,
    marginRight: -6,
  },
  toolButton: {
    padding: 6,
  },
  compoundText: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  ipaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  // Plain RN Text inside the word's text, since the app's Text leaves the weight to inherit, which would make it bold
  ipaInline: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontFamily: 'GoogleSans',
    fontWeight: 'normal',
  },
  formsChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
  },
  formsChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
