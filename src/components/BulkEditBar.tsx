import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { MASTERY_LEVELS, type MasteryLevel } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { Text } from './Text';

interface BulkEditBarProps {
  count: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onSetLevel: (level: MasteryLevel) => void;
  onDelete: () => void;
  onDone: () => void;
}

/** Words' select mode: set the level of, or delete, the selected words */
export default function BulkEditBar({ count, allSelected, onToggleAll, onSetLevel, onDelete, onDone }: BulkEditBarProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        <Text style={styles.count}>{`${count} selected`}</Text>
        <TouchableOpacity onPress={onToggleAll} hitSlop={6} accessibilityRole="button" accessibilityLabel={allSelected ? 'Select none' : 'Select all'}>
          <Text style={styles.link}>{allSelected ? 'None' : 'All'}</Text>
        </TouchableOpacity>
        <View style={styles.spacer} />
        <TouchableOpacity
          onPress={() => setConfirming(true)}
          disabled={!count}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Delete selected words"
        >
          <Ionicons name="trash-outline" size={20} color={count ? Colors.danger : Colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.done} onPress={onDone} accessibilityRole="button" accessibilityLabel="Done selecting">
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Set to</Text>
        {MASTERY_LEVELS.map((level) => (
          <TouchableOpacity
            key={level}
            style={[styles.level, { borderColor: getMasteryLevelColor(level) }, !count && styles.disabled]}
            onPress={() => onSetLevel(level)}
            disabled={!count}
            accessibilityRole="button"
            accessibilityLabel={`Set selected words to ${level}`}
          >
            <Text style={[styles.levelText, { color: getMasteryLevelColor(level) }]}>{level}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ConfirmDialog
        visible={confirming}
        title={`Delete ${count} ${count === 1 ? 'word' : 'words'}?`}
        message="Their meanings, notes and quiz progress go with them. This action cannot be undone."
        confirmText="Delete"
        onConfirm={() => {
          setConfirming(false);
          onDelete();
        }}
        onCancel={() => setConfirming(false)}
        destructive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  count: { fontSize: 14, fontWeight: '700', color: Colors.text },
  link: { fontSize: 14, fontWeight: '600', color: Colors.primaryLight },
  spacer: { flex: 1 },
  done: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  doneText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  label: { fontSize: 12, color: Colors.textSecondary },
  level: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  levelText: { fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
