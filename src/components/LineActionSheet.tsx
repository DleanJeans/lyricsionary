import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { Text } from './Text';

interface Props {
  visible: boolean;
  /** The held line, shown at the top so it's clear which one the buttons act on */
  line: string;
  /** Languages of the line's translations that can be edited */
  translationLanguages: string[];
  onClose: () => void;
  onCopy: () => void;
  onEditLine: () => void;
  onEditTranslation: (language: string) => void;
}

/** What to do with a line held in Learn: copy it, or open it in the Editor (original or a translation) */
export default function LineActionSheet({ visible, line, translationLanguages, onClose, onCopy, onEditLine, onEditTranslation }: Props) {
  const bottomSpace = Math.max(useSafeAreaInsets().bottom, 48) + 16;
  const pick = (action: () => void) => () => {
    onClose();
    action();
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: bottomSpace }]}>
          <Text style={styles.line} numberOfLines={2}>{line}</Text>
          <Action icon="copy-outline" label="Copy" onPress={pick(onCopy)} />
          <Action icon="create-outline" label="Edit line" onPress={pick(onEditLine)} />
          {translationLanguages.map((language) => (
            <Action
              key={language}
              icon="language-outline"
              label={translationLanguages.length > 1 ? `Edit ${language} translation` : 'Edit translation'}
              onPress={pick(() => onEditTranslation(language))}
            />
          ))}
        </View>
      </View>
    </Modal>
  );
}

function Action({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={22} color={Colors.primary} />
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: Colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingHorizontal: 16, gap: 4 },
  line: { fontSize: 14, fontStyle: 'italic', color: Colors.textSecondary, paddingBottom: 10, paddingHorizontal: 4 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, backgroundColor: Colors.surface },
  actionText: { fontSize: 16, color: Colors.text },
});
