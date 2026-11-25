import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';
import { MasteryLevel } from '../types';
import { Text } from './Text';

interface MasteryLevelSelectorProps {
  /** None for a word not saved yet */
  value?: MasteryLevel;
  onChange: (value: MasteryLevel) => void;
  /** Adds a full-width Delete button below the levels that unsaves the word, e.g. one saved by an accidental tap */
  onRemove?: () => void;
}

const levels: {
  value: MasteryLevel;
  label: string;
  color: string;
}[] = [
  {
    value: 'Seen',
    label: 'Seen',
    color: Colors.masterySeen,
  },
  {
    value: 'Recognized',
    label: 'Recognized',
    color: Colors.masteryRecognized,
  },
  {
    value: 'Recalled',
    label: 'Recalled',
    color: Colors.masteryRecalled,
  },
  {
    value: 'Known',
    label: 'Known',
    color: Colors.masteryKnown,
  },
];

interface MasteryOptionProps {
  level: (typeof levels)[number];
  active: boolean;
  onPress: () => void;
}

function MasteryOption({ level, active, onPress, first }: MasteryOptionProps & { first: boolean }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        !first && styles.buttonDivider,
        active && styles.buttonActive,
        active && { backgroundColor: level.color },
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={level.label + ' mastery level'}
      accessibilityState={{ selected: active }}
    >
      <Text
        style={[styles.buttonText, active && styles.buttonTextActive]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {level.label}
      </Text>
    </Pressable>
  );
}

export default function MasteryLevelSelector({ value, onChange, onRemove }: MasteryLevelSelectorProps) {
  return (
    <View style={styles.selector}>
      <View style={styles.levels}>
        {levels.map((level, i) => (
          <MasteryOption
            first={i === 0}
            key={level.value}
            level={level}
            active={value === level.value}
            onPress={() => onChange(level.value)}
          />
        ))}
      </View>
      {onRemove && (
        <Pressable
          style={({ pressed }) => [styles.removeButton, pressed && styles.buttonPressed]}
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel="Remove word"
        >
          <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          <Text style={styles.removeText}>Delete</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  selector: {
    gap: 8,
  },
  levels: {
    // One joined control: the segments share borders and only the outer corners are rounded
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  buttonDivider: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  button: {
    // The four levels share the row equally
    flex: 1,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  removeText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.72,
  },
  buttonActive: {
    borderLeftColor: 'transparent',
  },
  buttonText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  buttonTextActive: {
    color: Colors.background,
  },
});
