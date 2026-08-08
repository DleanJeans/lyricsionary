import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
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
    value: 'Unknown',
    label: 'Unknown',
    color: Colors.masteryUnknown,
  },
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

export default function MasteryLevelSelector({ value, onChange }: MasteryLevelSelectorProps) {
  return (
    <View style={styles.selector}>
      {levels.map((level) => {
        const isActive = value === level.value;
        return (
          <TouchableOpacity
            key={level.value}
            style={[
              styles.button,
              isActive && styles.buttonActive,
              isActive && {
                backgroundColor: level.color,
              },
            ]}
            onPress={() => onChange(level.value)}
            accessibilityRole="radio"
            accessibilityLabel={level.label}
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.buttonText,
                isActive && styles.buttonTextActive,
              ]}
            >
              {level.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
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
