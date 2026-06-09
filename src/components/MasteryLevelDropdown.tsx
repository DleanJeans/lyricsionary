import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { LayoutRectangle, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { MasteryLevel } from '../types';
import { Text } from './Text';

const MASTERY_LEVELS: MasteryLevel[] = ['New', 'Learning', 'Mastered'];

interface MasteryLevelDropdownProps {
  onSelect: (level: MasteryLevel) => void;
}

export default function MasteryLevelDropdown({ onSelect }: MasteryLevelDropdownProps) {
  const [open, setOpen] = useState(false);
  const [triggerLayout, setTriggerLayout] = useState<LayoutRectangle | null>(null);

  return (
    <>
      <TouchableOpacity
        accessibilityLabel="Set Mastery Level"
        style={styles.trigger}
        onPress={() => setOpen((v) => !v)}
        onLayout={(e) => setTriggerLayout(e.nativeEvent.layout)}
      >
        <Ionicons name="star-outline" size={16} color={Colors.primary} />
      </TouchableOpacity>

      {open && triggerLayout && (
        <>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View
            style={[
              styles.dropdown,
              {
                top: triggerLayout.y + triggerLayout.height + 4,
                right: 0,
              },
            ]}
          >
            {MASTERY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={styles.masteryOption}
                onPress={() => {
                  setOpen(false);
                  onSelect(level);
                }}
              >
                <View style={[styles.masteryDot, { backgroundColor: getMasteryLevelColor(level) }]} />
                <Text style={styles.masteryOptionText}>{level}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginLeft: 4,
    marginBottom: -4,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  dropdown: {
    position: 'absolute',
    zIndex: 20,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 6,
    minWidth: 160,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  masteryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 10,
  },
  masteryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  masteryOptionText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
});
