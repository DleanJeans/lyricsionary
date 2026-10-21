import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/theme';
import { getLowercaseVersion, getWordTransforms, isCapitalized } from '../utils/wordTransform';
import { getCachedWiktionaryEntry, hasWiktionaryEntry } from '../utils/wiktionary';

interface WordTransformButtonsProps {
  word: string;
  language?: string;
  songId?: string;
  songName?: string;
  artistName?: string;
  lyricsLine?: string;
  translationLine?: string;
  originalLanguages?: string[];
  source?: 'Learn' | 'Words';
  occurrence?: number;
  hideOriginalWord?: boolean;
  extraWords?: string[];
}

export default function WordTransformButtons({
  word,
  language,
  songId,
  songName,
  artistName,
  lyricsLine,
  translationLine,
  originalLanguages,
  source,
  occurrence,
  hideOriginalWord = false,
  extraWords = [],
}: WordTransformButtonsProps) {
  const navigation = useNavigation<any>();

  // Only show the lowercase button once Wiktionary confirms it has an entry
  // (e.g. German nouns only have a capitalized page); a failed check still shows it
  const lowercaseWord = isCapitalized(word) ? getLowercaseVersion(word) : null;
  const [lowercaseCheck, setLowercaseCheck] = useState<{ word: string; exists: boolean | null } | null>(null);
  const lowercaseExists = lowercaseWord
    ? (getCachedWiktionaryEntry(lowercaseWord) ??
      (lowercaseCheck?.word === lowercaseWord ? lowercaseCheck.exists : undefined))
    : undefined;
  const hideLowercase = lowercaseWord !== null && (lowercaseExists === undefined || lowercaseExists === false);

  useEffect(() => {
    if (!lowercaseWord) return;
    let cancelled = false;
    hasWiktionaryEntry(lowercaseWord).then((exists) => {
      if (!cancelled) setLowercaseCheck({ word: lowercaseWord, exists });
    });
    return () => {
      cancelled = true;
    };
  }, [lowercaseWord]);

  // Get all transformed versions of the word
  const transforms = [
    ...new Set([...getWordTransforms(word, language || originalLanguages?.[0]), ...extraWords]),
  ].filter((w) => !hideLowercase || w !== lowercaseWord || extraWords.includes(w));

  // Always show at least the original word as a button
  const wordsToShow = hideOriginalWord ? transforms : [word, ...transforms];

  const handleLookup = (transformedWord: string) => {
    navigation.navigate('WordLookup', {
      word: transformedWord,
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

  return (
    <View style={[styles.container, wordsToShow.length > 0 && { marginTop: 12 }]}>
      {wordsToShow.map((transformedWord, index) => (
        <TouchableOpacity
          key={`${transformedWord}-${index}`}
          style={styles.button}
          onPress={() => handleLookup(transformedWord)}
        >
          <Ionicons name="search" size={16} color={Colors.primary} />
          {transformedWord !== word && <Text style={styles.buttonText}>{transformedWord}</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Let long words (e.g. German compounds) wrap on web, where unbreakable words overflow by default
const webWordBreak = Platform.OS === 'web' ? ({ wordBreak: 'break-word' } as object) : {};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 6,
    maxWidth: '100%',
  },
  buttonText: {
    flexShrink: 1,
    ...webWordBreak,
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
