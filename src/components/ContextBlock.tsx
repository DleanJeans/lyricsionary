import React from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

interface ContextBlockProps {
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
  showRemoveButton?: boolean;
}

export default function ContextBlock({
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
}: ContextBlockProps) {
  return (
    <View style={styles.container}>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
          <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
      )}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Context</Text>
        <TextInput
          style={styles.fieldInput}
          value={context}
          onChangeText={onContextChange}
          placeholder="Line of lyrics"
          placeholderTextColor={Colors.textMuted}
        />
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
    position: 'absolute',
    top: -4,
    right: -4,
    zIndex: 10,
    padding: 2,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
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