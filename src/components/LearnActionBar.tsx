import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { Text } from './Text';

interface LearnActionBarProps {
  fontSize: number;
  lineCount: number;
  onDecreaseFontSize: () => void;
  onIncreaseFontSize: () => void;
}

export default function LearnActionBar({
  fontSize,
  lineCount,
  onDecreaseFontSize,
  onIncreaseFontSize,
}: LearnActionBarProps) {
  return (
    <View style={styles.actionBar}>
      <View style={styles.fontSizeControl}>
        <Ionicons
          name="text-outline"
          size={18}
          color={Colors.textSecondary}
        />
        <TouchableOpacity
          onPress={onDecreaseFontSize}
          style={styles.fontBtn}
        >
          <Ionicons
            name="remove"
            size={18}
            color={Colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.fontSizeText}>{fontSize}</Text>
        <TouchableOpacity
          onPress={onIncreaseFontSize}
          style={styles.fontBtn}
        >
          <Ionicons
            name="add"
            size={18}
            color={Colors.text}
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.lineCounter}>{lineCount} lines</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fontSizeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fontBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 6,
  },
  fontSizeText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  lineCounter: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
});
