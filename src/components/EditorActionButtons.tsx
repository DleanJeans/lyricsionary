import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { Text } from './Text';

interface EditorActionButtonsProps {
  showPasteAction: boolean;
  isEditMode: boolean;
  hasChanges: boolean;
  isSaving: boolean;
  allEmpty: boolean;
  onPaste: () => void;
  onSave: () => void;
  onReset: () => void;
  onClear: () => void;
}

export default function EditorActionButtons({
  showPasteAction,
  isEditMode,
  hasChanges,
  isSaving,
  allEmpty,
  onPaste,
  onSave,
  onReset,
  onClear,
}: EditorActionButtonsProps) {
  return (
    <View style={styles.actions}>
      {showPasteAction ? (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onPaste}
        >
          <Ionicons
            name="clipboard-outline"
            size={20}
            color={Colors.white}
          />
          <Text style={styles.actionButtonText}>Paste</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.saveButton,
            (isEditMode && !hasChanges) || isSaving ? styles.disabled : null,
          ]}
          disabled={isSaving || (isEditMode && !hasChanges)}
          onPress={onSave}
        >
          {isSaving ? (
            <ActivityIndicator
              color={Colors.white}
              size="small"
            />
          ) : (
            <>
              <Ionicons
                name="checkmark"
                size={20}
                color={Colors.white}
              />
              <Text style={styles.actionButtonText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      )}
      {isEditMode ? (
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.dangerButton,
            (!hasChanges || isSaving) && styles.disabled,
          ]}
          disabled={!hasChanges || isSaving}
          onPress={onReset}
        >
          <Ionicons
            name="refresh"
            size={20}
            color={Colors.white}
          />
          <Text style={styles.actionButtonText}>Reset</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.dangerButton,
            allEmpty && styles.disabled,
          ]}
          disabled={allEmpty}
          onPress={onClear}
        >
          <Ionicons
            name="close"
            size={20}
            color={Colors.white}
          />
          <Text style={styles.actionButtonText}>Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 16,
  },
  actionButton: {
    flex: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  saveButton: {
    backgroundColor: Colors.success,
  },
  dangerButton: {
    flex: 4,
    backgroundColor: Colors.danger,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.35,
  },
});
