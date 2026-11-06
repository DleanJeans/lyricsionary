import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { getFlagForLanguage } from '../constants/languages';
import { Colors } from '../constants/theme';
import { useWiktionaryPronunciation } from '../hooks/useWiktionaryPronunciation';
import { useStore } from '../store/useStore';
import { WordEntry } from '../types';
import AlsoInSongs from './AlsoInSongs';
import QuickNote from './QuickNote';
import DueLabel from './DueLabel';
import MasteryLevelBadge from './MasteryLevelBadge';
import MasteryLevelSelector from './MasteryLevelSelector';
import SavedPill from './SavedPill';
import HighlightedText from './HighlightedText';
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
}: WordCardProps) {
  const navigation = useNavigation<any>();
  const addOrUpdateWord = useStore((s) => s.addOrUpdateWord);
  // Learn: the level badge opens a level picker, to change it without opening the word
  const [choosingLevel, setChoosingLevel] = useState(false);
  useEffect(() => setChoosingLevel(false), [item.id]);
  const swipeableRef = useRef<Swipeable>(null);
  // Only the Learn screen's card for the selected word, not every card in the Words list
  const wiktionary = useWiktionaryPronunciation(item.word, item.language, {
    enabled: showClose,
    savedAudio: item.audio,
    needsIpa: !item.pronunciation,
  });
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
    item.contexts?.[0];
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
      <TouchableOpacity
        style={styles.deleteButton}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${item.word}`}
        onPress={() => onDelete?.(item, () => swipeableRef.current?.close())}
        activeOpacity={0.7}
      >
        <Ionicons name="trash" size={24} color={Colors.white} />
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderDeleteActions}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[styles.card, isWide && styles.cardWide]}
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
              {/* Level, word and IPA share a row; a long word pushes the IPA under it */}
              <View style={styles.title}>
                <MasteryLevelBadge level={item.masteryLevel} open={choosingLevel} onPress={() => setChoosingLevel((v) => !v)} />
                <Text style={styles.titleWordText}>{item.word}</Text>
                {ipa ? <Text style={styles.ipaText}>{ipa}</Text> : null}
                {justSaved && <SavedPill />}
              </View>
              <View style={styles.headerTools}>
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
            {wiktionary.audio.length > 0 && (
              <View style={styles.ipaRow}>
                <PronunciationAudio audio={wiktionary.audio} compact short />
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
            <AlsoInSongs item={item} songId={songId} hideTranslations={quizPending} />
          </>
        ) : (
          <View style={styles.cardRow}>
            <Text style={styles.flag}>{flag}</Text>
            <View style={styles.cardContent}>
              <HighlightedText
                text={item.word}
                query={searchQuery}
                style={styles.cardWordText}
              />
              {ipa ? (
                <HighlightedText
                  text={ipa}
                  query={searchQuery}
                  style={styles.pronunciation}
                />
              ) : null}
            </View>
            {!!item.forms?.length && (
              <View style={styles.formsChip} accessibilityLabel={`Also ${item.forms.join(', ')}`}>
                <Text style={styles.formsChipText}>
                  +{item.forms.length} {item.forms.length === 1 ? 'form' : 'forms'}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
}

const webWordBreak = Platform.OS === 'web' ? ({ wordBreak: 'break-word' } as object) : {};

const styles = StyleSheet.create({
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
  cardWide: {
    flex: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    rowGap: 2,
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
  ipaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  ipaText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
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
  cardWordText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  pronunciation: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: Colors.dangerDark,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    marginBottom: 10,
    marginRight: -28,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    paddingRight: 28,
  },
  deleteButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
