import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { LANGUAGES } from '../constants/languages';

interface MultiLanguageSelectProps {
  value: string[];
  onValueChange: (languages: string[]) => void;
  placeholder?: string;
}

export default function MultiLanguageSelect({ value, onValueChange, placeholder = 'Select Languages' }: MultiLanguageSelectProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(value);

  const handleSelect = () => {
    onValueChange(selectedLanguages);
    setShowModal(false);
  };

  const toggleLanguage = (langName: string) => {
    if (selectedLanguages.includes(langName)) {
      setSelectedLanguages(selectedLanguages.filter(l => l !== langName));
    } else {
      setSelectedLanguages([...selectedLanguages, langName]);
    }
  };

  const getDisplayText = () => {
    if (value.length === 0) {
      return placeholder;
    }
    const flags = value
      .map(langName => LANGUAGES.find(l => l.name === langName)?.flag)
      .filter(Boolean)
      .join(' ');
    return `${flags} (${value.length})`;
  };

  return (
    <>
      <TouchableOpacity style={styles.selectButton} onPress={() => { setSelectedLanguages(value); setShowModal(true); }}>
        <Text style={[styles.selectText, value.length === 0 && styles.selectPlaceholder]}>
          {getDisplayText()}
        </Text>
        <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Languages</Text>
            <Text style={styles.modalSubtitle}>Choose one or more languages</Text>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isSelected = selectedLanguages.includes(item.name);
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      isSelected && styles.modalItemSelected,
                    ]}
                    onPress={() => toggleLanguage(item.name)}
                  >
                    <Text style={styles.modalItemEmoji}>{item.flag}</Text>
                    <Text
                      style={[
                        styles.modalItemText,
                        isSelected && styles.modalItemTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalAdd} onPress={handleSelect}>
                <Text style={styles.modalAddText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectButton: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  selectPlaceholder: {
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    maxHeight: '70%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  modalItemSelected: {
    backgroundColor: Colors.surfaceLight,
  },
  modalItemEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  modalItemText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  modalItemTextSelected: {
    fontWeight: '600',
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  modalCancelText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalAdd: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalAddText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
