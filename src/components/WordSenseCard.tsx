import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput } from './Text'
import { Ionicons } from '@expo/vector-icons';
import { emojisByCategory } from 'rn-emoji-keyboard';
import { Colors } from '../constants/theme';
import SongContextBlock from './SongContextBlock';
import SelectableTranslation from './SelectableTranslation';
import type { WiktionaryDefinition } from '../utils/wiktionary';
import { suggestEmoji } from '../utils/emojiSuggestion';
import { findPartOfSpeech, PARTS_OF_SPEECH, type PartOfSpeech } from '../utils/partOfSpeech';

interface WordSenseCardProps {
  context: string;
  onContextChange: (value: string) => void;
  emoji: string;
  onEmojiPress: () => void;
  onEmojiChange?: (value: string) => void;
  ipa: string;
  onIpaChange: (value: string) => void;
  ipaPlaceholder: string;
  definition: string;
  onDefinitionChange: (value: string) => void;
  definitionSuggestions?: WiktionaryDefinition[];
  partOfSpeech?: PartOfSpeech;
  onPartOfSpeechChange?: (value: PartOfSpeech) => void;
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
  onEmojiChange,
  ipa,
  onIpaChange,
  ipaPlaceholder,
  definition,
  onDefinitionChange,
  definitionSuggestions,
  partOfSpeech,
  onPartOfSpeechChange,
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
  const canLowercase = !isRemoved && definition !== definition.toLowerCase();
  const [choosingType, setChoosingType] = useState(false);
  const [editingIpa, setEditingIpa] = useState(false);
  // Shown faded until tapped to keep it
  const suggestedEmoji = useMemo(
    () => (!emoji && onEmojiChange && !isRemoved ? suggestEmoji(definition, emojisByCategory) : null),
    [emoji, onEmojiChange, isRemoved, definition]
  );
  // The chosen type, otherwise the one saving would find from the definition
  const shownType = partOfSpeech ?? findPartOfSpeech(definition, definitionSuggestions ?? []);

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
            <TouchableOpacity onPress={onRemove} style={styles.removeButton} accessibilityRole="button" accessibilityLabel="Remove context">
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
              onTranslationSelect={isRemoved ? undefined : onDefinitionChange}
              selectedTranslation={definition}
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
          isRemoved ? (
            <Text style={styles.translationText}>{translation}</Text>
          ) : (
            <View style={styles.translationSelectable}>
              <SelectableTranslation
                translation={translation}
                onSelect={onDefinitionChange}
                value={definition}
                style={styles.translationText}
              />
            </View>
          )
        ) : null}
      </View>
      <View style={styles.contextRow}>
        {suggestedEmoji ? (
          <TouchableOpacity
            style={styles.emojiButton}
            onPress={() => onEmojiChange?.(suggestedEmoji)}
            onLongPress={onEmojiPress}
            accessibilityRole="button"
            accessibilityLabel={`Use suggested emoji ${suggestedEmoji}`}
            accessibilityHint="Long press to choose another emoji"
          >
            <Text style={[styles.emojiButtonText, styles.emojiSuggested]}>{suggestedEmoji}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.emojiButton} onPress={onEmojiPress} accessibilityRole="button" accessibilityLabel="Choose emoji">
            {emoji ? (
              <Text style={styles.emojiButtonText}>{emoji}</Text>
            ) : (
              <Ionicons name="happy-outline" size={20} color={Colors.textMuted} />
            )}
          </TouchableOpacity>
        )}
        <View style={styles.contextDefinitionField}>
          <TextInput
            style={[styles.rowInput, canLowercase && styles.fieldInputWithButton]}
            value={definition}
            onChangeText={onDefinitionChange}
            placeholder="Definition"
            numberOfLines={1}
            placeholderTextColor={Colors.textMuted}
          />
          {canLowercase && (
            <TouchableOpacity
              style={styles.lowercaseButton}
              onPress={() => onDefinitionChange(definition.toLowerCase())}
              accessibilityLabel="Make definition lowercase"
            >
              <Text style={styles.lowercaseButtonText}>aa</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {!isRemoved ? (
        <View style={styles.typeRow}>
          {onPartOfSpeechChange && definition.trim() !== '' && (
            <TouchableOpacity
              style={[styles.typeChip, !shownType && styles.typeChipUnset]}
              onPress={() => setChoosingType((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={shownType ? `Word type: ${shownType}` : 'Set word type'}
              accessibilityState={{ expanded: choosingType }}
            >
              <Text style={[styles.typeChipText, !shownType && styles.typeChipTextUnset]}>{shownType ?? 'set type'}</Text>
              <Ionicons name={choosingType ? 'chevron-up' : 'chevron-down'} size={10} color={shownType ? Colors.textSecondary : Colors.primary} />
            </TouchableOpacity>
          )}
          {onPartOfSpeechChange && choosingType && PARTS_OF_SPEECH.filter((type) => type !== shownType).map((type) => (
            <TouchableOpacity
              key={type}
              style={styles.typeChip}
              onPress={() => {
                setChoosingType(false);
                onPartOfSpeechChange(type);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Make it a ${type}`}
            >
              <Text style={styles.typeChipText}>{type}</Text>
            </TouchableOpacity>
          ))}
          {editingIpa ? (
            <TextInput
              style={[styles.typeChip, styles.ipaInput]}
              value={ipa}
              onChangeText={onIpaChange}
              placeholder={ipaPlaceholder}
              placeholderTextColor={Colors.textMuted}
              numberOfLines={1}
              autoFocus
              onBlur={() => setEditingIpa(false)}
              onSubmitEditing={() => setEditingIpa(false)}
            />
          ) : (
            <TouchableOpacity
              style={[styles.typeChip, !ipa && styles.ipaChipUnset]}
              onPress={() => setEditingIpa(true)}
              accessibilityRole="button"
              accessibilityLabel={ipa ? `IPA: ${ipa}` : 'Add IPA'}
            >
              <Text style={styles.typeChipText}>{ipa || '+ IPA'}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : ipa ? (
        <View style={styles.typeRow}>
          <View style={styles.typeChip}>
            <Text style={styles.typeChipText}>{ipa}</Text>
          </View>
        </View>
      ) : null}
      {!isRemoved && definitionSuggestions && definitionSuggestions.length > 0 && (
        <View style={styles.suggestionsRow}>
          {definitionSuggestions
            .filter((suggestion) => suggestion.text !== definition)
            .map((suggestion) => (
              <TouchableOpacity
                key={`${suggestion.partOfSpeech}-${suggestion.text}`}
                style={styles.suggestionButton}
                onPress={() => onDefinitionChange(suggestion.text)}
                accessibilityLabel={`Use definition: ${suggestion.text}`}
              >
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {suggestion.partOfSpeech ? (
                    <Text style={styles.suggestionPartOfSpeech}>{suggestion.partOfSpeech.toLowerCase()} </Text>
                  ) : null}
                  {suggestion.text}
                </Text>
              </TouchableOpacity>
            ))}
        </View>
      )}

      {isRemoved && onUndoRemove && (
        <TouchableOpacity style={styles.undoButton} onPress={onUndoRemove}>
          <Ionicons name="arrow-undo-outline" size={18} color={Colors.primary} />
          <Text style={styles.undoButtonText}>Undo remove</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const ROW_HEIGHT = 44;

const styles = StyleSheet.create({
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeChipUnset: {
    borderStyle: 'dashed',
    borderColor: Colors.primary,
  },
  typeChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  typeChipTextUnset: {
    color: Colors.primary,
  },
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
  translationSelectable: {
    marginHorizontal: -2,
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
  // The emoji button and the definition share one box
  contextRow: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  rowInput: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 12,
    fontSize: 15,
    color: Colors.text,
  },
  ipaInput: {
    width: 130,
    paddingVertical: 2,
    fontSize: 12,
    color: Colors.text,
  },
  ipaChipUnset: {
    borderStyle: 'dashed',
  },
  contextDefinitionField: {
    flex: 1,
    justifyContent: 'center',
  },
  fieldInputWithButton: {
    paddingRight: 40,
  },
  lowercaseButton: {
    position: 'absolute',
    right: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lowercaseButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryLight,
  },
  emojiButton: {
    width: ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  emojiButtonText: {
    fontSize: 22,
    textAlign: 'center',
  },
  emojiSuggested: {
    opacity: 0.4,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionButton: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: '100%',
  },
  suggestionText: {
    color: Colors.text,
    fontSize: 14,
  },
  suggestionPartOfSpeech: {
    color: Colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
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