import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Colors } from '../constants/theme';
import SelectableTranslation from './SelectableTranslation';
import { findWordOccurrences } from '../utils/wordOccurrences';

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
  onTranslationSelect?: (text: string) => void;
  selectedTranslation?: string;
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
  onTranslationSelect,
  selectedTranslation,
}: SongContextBlockProps) {
  const ranges = useMemo(() => findWordOccurrences(context, word || ''), [context, word]);
  const computedOccurrenceCount = occurrenceCount ?? ranges.length;

  const renderHighlightedText = () => {
    if (!word || !context) return <Text style={styles.contextText}>{context}</Text>;

    const parts: { text: string; isHighlight: boolean }[] = [];
    let lastIndex = 0;
    ranges.forEach(([start, end], i) => {
      if (start > lastIndex) {
        parts.push({ text: context.slice(lastIndex, start), isHighlight: false });
      }
      parts.push({ text: context.slice(start, end), isHighlight: i + 1 === occurrence });
      lastIndex = end;
    });

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
      {translation && onTranslationSelect ? (
        <View style={styles.translationSelectable}>
          <SelectableTranslation
            translation={translation}
            onSelect={onTranslationSelect}
            value={selectedTranslation}
            style={styles.translationText}
          />
        </View>
      ) : translation ? (
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
  translationSelectable: {
    marginTop: 2,
    marginHorizontal: -2,
  },
});