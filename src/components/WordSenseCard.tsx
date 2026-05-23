import React from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import SongContextBlock from './SongContextBlock';

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
  fromSong?: boolean;
  songName?: string;
  artistName?: string;
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
  fromSong = false,
  songName,
  artistName,
}: WordSenseCardProps) {
  return (
    <View style={styles.container}>
      
      <View style={styles.field}>
        <View style={styles.contextLabelRow}>
          <Text style={styles.fieldLabel}>Context</Text>
          {onRemove && (
            <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
              <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {fromSong && context ? (
          <View style={styles.contextDisplay}>
            <SongContextBlock
              context={context}
              word={word}
              occurrence={occurrence}
              onOccurrenceChange={onOccurrenceChange}
              songName={songName}
              artistName={artistName}
              translation={translation}
              showSongName={false}
            />
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
        {!fromSong && translation ? (
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
  contextDisplay: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
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