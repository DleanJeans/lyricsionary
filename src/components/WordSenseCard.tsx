import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput } from './Text'
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
  onUndoRemove?: () => void;
  word?: string;
  occurrence?: number;
  onOccurrenceChange?: (value: number) => void;
  translation?: string;
  fromSong?: boolean;
  songName?: string;
  artistName?: string;
  isNew?: boolean;
  isRemoved?: boolean;
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
  onUndoRemove,
  word,
  occurrence = 1,
  onOccurrenceChange,
  translation,
  fromSong = false,
  songName,
  artistName,
  isNew = false,
  isRemoved = false,
}: WordSenseCardProps) {
  const containerStyle = [
    styles.container,
    isRemoved && styles.containerRemoved,
    isNew && !isRemoved && styles.containerNew,
  ];

  return (
    <View style={containerStyle}>
      <View style={styles.field}>
        <View style={styles.contextLabelRow}>
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
            placeholder="Context"
            placeholderTextColor={Colors.textMuted}
          />
        )}
        {!fromSong && translation ? (
          <Text style={styles.translationText}>{translation}</Text>
        ) : null}
      </View>
      <View style={styles.contextRow}>
        <View style={styles.contextEmojiField}>
          <TouchableOpacity style={styles.emojiButtonSmall} onPress={onEmojiPress}>
            {emoji ? (
              <Text style={styles.emojiButtonTextSmall}>{emoji}</Text>
            ) : (
              <Ionicons name="happy-outline" size={20} color={Colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.contextIpaField}>
          <TextInput
            style={styles.fieldInput}
            value={ipa}
            onChangeText={onIpaChange}
            placeholder={ipaPlaceholder}
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <View style={styles.contextDefinitionField}>
          <TextInput
            style={styles.fieldInput}
            value={definition}
            onChangeText={onDefinitionChange}
            placeholder="Definition"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      {isRemoved && onUndoRemove && (
        <TouchableOpacity style={styles.undoButton} onPress={onUndoRemove}>
          <Ionicons name="arrow-undo-outline" size={18} color={Colors.primary} />
          <Text style={styles.undoButtonText}>Undo remove</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    position: 'relative',
  },
  containerNew: {
    backgroundColor: 'rgba(0, 184, 148, 0.08)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  containerRemoved: {
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  removeButton: {
    position: 'absolute',
    zIndex: 1,
    top: 1,
    right: 1,
  },
  field: {
  },
  contextLabelRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
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
  },
  contextIpaField: {
    flex: 1,
  },
  contextDefinitionField: {
    flex: 1.5,
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
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  undoButtonText: {
    color: Colors.primaryLight,
    fontSize: 14,
    fontWeight: '500',
  },
});