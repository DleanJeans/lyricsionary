import React, { useMemo } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

interface WordSenseCardProps {
  context: string;
  onContextChange: (value: string) => void;
  emoji: string;
  onEmojiPress: () => void;
  ipa: string;
  onIpaChange: (value: string) => void;
  ipaPlaceholder: string;
  definition: string;
  onDefinitionChange: (value: string) => void;
  onRemove?: () => void;
  word?: string;
  occurrence?: number;
  onOccurrenceChange?: (value: number) => void;
  translation?: string;
  readOnly?: boolean;
}

function countOccurrences(text: string, word: string): number {
  if (!word || !text) return 0;
  const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

export default function WordSenseCard({
  context,
  onContextChange,
  emoji,
  onEmojiPress,
  ipa,
  onIpaChange,
  ipaPlaceholder,
  definition,
  onDefinitionChange,
  onRemove,
  word,
  occurrence = 1,
  onOccurrenceChange,
  translation,
  readOnly = false,
}: WordSenseCardProps) {
  const occurrenceCount = useMemo(
    () => countOccurrences(context, word || ''),
    [context, word]
  );

  const showOccurrenceSelector = occurrenceCount > 1;

  const renderContextText = () => {
    if (!word || !context) return context;

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
    const next = occurrence >= occurrenceCount ? 1 : occurrence + 1;
    onOccurrenceChange(next);
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.field}>
        <View style={styles.contextLabelRow}>
          <Text style={styles.fieldLabel}>Context</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {showOccurrenceSelector && (
              <TouchableOpacity style={styles.occurrenceButton} onPress={handleOccurrencePress}>
                <Text style={styles.occurrenceText}>{occurrence}/{occurrenceCount}</Text>
              </TouchableOpacity>
            )}
            {onRemove && (
              <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
                <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {readOnly ? (
          <View style={styles.contextDisplay}>
            {renderContextText()}
          </View>
        ) : (
          <TextInput
            style={styles.fieldInput}
            value={context}
            onChangeText={onContextChange}
            placeholder="Line of lyrics"
            placeholderTextColor={Colors.textMuted}
          />
        )}
        {translation ? (
          <Text style={styles.translationText}>{translation}</Text>
        ) : null}
      </View>
      <View style={styles.contextRow}>
        <View style={styles.contextEmojiField}>
          <Text style={styles.fieldLabel}>Emoji</Text>
          <TouchableOpacity style={styles.emojiButtonSmall} onPress={onEmojiPress}>
            {emoji ? (
              <Text style={styles.emojiButtonTextSmall}>{emoji}</Text>
            ) : (
              <Ionicons name="happy-outline" size={20} color={Colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.contextIpaField}>
          <Text style={styles.fieldLabel}>IPA</Text>
          <TextInput
            style={styles.fieldInput}
            value={ipa}
            onChangeText={onIpaChange}
            placeholder={ipaPlaceholder}
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <View style={styles.contextDefinitionField}>
          <Text style={styles.fieldLabel}>Definition</Text>
          <TextInput
            style={styles.fieldInput}
            value={definition}
            onChangeText={onDefinitionChange}
            placeholder="Add definition"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    position: 'relative',
  },
  removeButton: {
  },
  field: {
    gap: 6,
  },
  contextLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
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
  contextDisplay: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contextText: {
    fontSize: 15,
    color: Colors.text,
  },
  contextUnderlined: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  translationText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  fieldInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contextRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  contextEmojiField: {
    width: 60,
    gap: 6,
  },
  contextIpaField: {
    flex: 1,
    gap: 6,
  },
  contextDefinitionField: {
    flex: 1.5,
    gap: 6,
  },
  emojiButtonSmall: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emojiButtonTextSmall: {
    fontSize: 22,
    textAlign: 'center',
  },
});