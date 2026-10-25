import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { getFlagForLanguage } from '../constants/languages';
import { Colors } from '../constants/theme';
import { useWiktionaryPronunciation } from '../hooks/useWiktionaryPronunciation';
import { useStore } from '../store/useStore';
import { WordEntry } from '../types';
import MasteryLevelBadge from './MasteryLevelBadge';
import MasteryLevelSelector from './MasteryLevelSelector';
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
        onPress={handleCardPress}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.word}`}
      >
        {showClose ? (
          // Learn screen: same layout as the new word card
          <>
            <View style={styles.header}>
              <View style={styles.title}>
                <View style={styles.badgeRow}>
                  <MasteryLevelBadge level={item.masteryLevel} open={choosingLevel} onPress={() => setChoosingLevel((v) => !v)} />
                  <Text style={styles.badgeEmoji}>{flag}</Text>
                </View>
                <Text style={styles.titleWordText}>{item.word}</Text>
              </View>
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
            {(ipa || wiktionary.audio.length > 0) && (
              <View style={styles.ipaRow}>
                {ipa ? <Text style={styles.ipaText}>{ipa}</Text> : null}
                <PronunciationAudio audio={wiktionary.audio} compact />
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
                />
              </View>
            )}
            {quiz}
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
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
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
    alignItems: 'flex-start',
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelPicker: {
    marginTop: 10,
  },
  badgeEmoji: {
    fontSize: 14,
  },
  titleWordText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  toolButton: {
    padding: 6,
    marginTop: -6,
    marginRight: -6,
  },
  ipaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
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
