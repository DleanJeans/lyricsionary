import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Colors } from '../constants/theme';

interface SongContextBlockProps {
  context: string;
  word?: string;
  occurrence?: number;
  occurrenceCount?: number;
  onOccurrenceChange?: (value: number) => void;
  songName?: string;
  artistName?: string;
  translation?: string;
  showSongName?: boolean;
}

function countOccurrences(text: string, word: string): number {
  if (!word || !text) return 0;
  const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

export default function SongContextBlock({
  context,
  word,
  occurrence = 1,
  occurrenceCount,
  onOccurrenceChange,
  songName,
  artistName,
  translation,
  showSongName = true,
}: SongContextBlockProps) {
  const computedOccurrenceCount = occurrenceCount ?? useMemo(
    () => countOccurrences(context, word || ''),
    [context, word]
  );

  const renderHighlightedText = () => {
    if (!word || !context) return <Text style={styles.contextText}>{context}</Text>;

    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let occurrenceIndex = 0;
    const parts: { text: string; isHighlight: boolean }[] = [];
    const regex = new RegExp(`(${escapedWord})`, 'gi');
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(context)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: context.slice(lastIndex, match.index), isHighlight: false });
      }
      occurrenceIndex++;
      parts.push({
        text: match[1],
        isHighlight: occurrenceIndex === occurrence,
      });
      lastIndex = match.index + match[1].length;
    }

    if (lastIndex < context.length) {
      parts.push({ text: context.slice(lastIndex), isHighlight: false });
    }

    if (parts.length === 0) {
      return <Text style={styles.contextText}>{context}</Text>;
    }

    return (
      <Text style={styles.contextText}>
        {parts.map((part, i) =>
          part.isHighlight ? (
            <Text key={i} style={styles.contextUnderlined}>{part.text}</Text>
          ) : (
            <Text key={i}>{part.text}</Text>
          )
        )}
      </Text>
    );
  };

  const handleOccurrencePress = () => {
    if (!onOccurrenceChange) return;
    const next = occurrence >= computedOccurrenceCount ? 1 : occurrence + 1;
    onOccurrenceChange(next);
  };

  return (
    <View style={styles.container}>
      {showSongName && songName ? (
        <Text style={styles.songName}>{artistName ? `${songName} - ${artistName}` : songName}</Text>
      ) : null}
      <View style={styles.contextRow}>
        <View style={styles.contextTextWrapper}>
          {renderHighlightedText()}
        </View>
        {computedOccurrenceCount > 1 && onOccurrenceChange ? (
          <TouchableOpacity style={styles.occurrenceButton} onPress={handleOccurrencePress}>
            <Text style={styles.occurrenceText}>{occurrence}/{computedOccurrenceCount}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {translation ? (
        <Text style={styles.translationText}>{translation}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  songName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contextTextWrapper: {
    flex: 1,
  },
  contextText: {
    fontSize: 15,
    color: Colors.text,
    fontStyle: 'italic',
  },
  contextUnderlined: {
    textDecorationLine: 'underline',
    fontWeight: '600',
    fontStyle: 'normal',
  },
  occurrenceButton: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  occurrenceText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  translationText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
});