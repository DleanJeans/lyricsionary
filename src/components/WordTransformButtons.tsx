import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/theme';
import { getWordTransforms } from '../utils/wordTransform';

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
  hideOriginalWord?: boolean;
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
  hideOriginalWord = false,
}: WordTransformButtonsProps) {
  const navigation = useNavigation<any>();

  // Get all transformed versions of the word
  const transforms = getWordTransforms(word, language || originalLanguages?.[0]);

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
    });
  };

  return (
    <View style={styles.container}>
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
  },
  buttonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
