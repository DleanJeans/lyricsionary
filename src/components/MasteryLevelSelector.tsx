import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';
import { MasteryLevel } from '../types';
import { Text } from './Text';

interface MasteryLevelSelectorProps {
  value: MasteryLevel;
  onChange: (value: MasteryLevel) => void;
}

const levels: {
  value: MasteryLevel;
  label: string;
  color: string;
}[] = [
  {
    value: 'New',
    label: 'New',
    color: Colors.masteryNew,
  },
  {
    value: 'Learning',
    label: 'Learning',
    color: Colors.masteryLearning,
  },
  {
    value: 'Mastered',
    label: 'Mastered',
    color: Colors.masteryMastered,
  },
];

interface MasteryOptionProps {
  level: (typeof levels)[number];
  active: boolean;
  onPress: () => void;
}

function MasteryOption({ level, active, onPress }: MasteryOptionProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        active && styles.buttonActive,
        active && { backgroundColor: level.color },
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={level.label + ' mastery level'}
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.buttonText, active && styles.buttonTextActive]}>
        {level.label}
      </Text>
    </Pressable>
  );
}

export default function MasteryLevelSelector({ value, onChange }: MasteryLevelSelectorProps) {
  return (
    <View style={styles.selector}>
      {levels.map((level) => (
        <MasteryOption
          key={level.value}
          level={level}
          active={value === level.value}
          onPress={() => onChange(level.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    flex: 1,
    minWidth: 76,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonPressed: {
    opacity: 0.72,
  },
  buttonActive: {
    borderColor: 'transparent',
  },
  buttonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextActive: {
    color: Colors.background,
  },
});
