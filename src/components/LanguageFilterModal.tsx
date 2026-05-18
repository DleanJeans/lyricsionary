import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { LANGUAGES } from '../constants/languages';

interface LanguageFilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
  availableLanguages: string[];
  languageCounts?: Record<string, number>; // Optional count per language
}

export default function LanguageFilterModal({
  visible,
  onClose,
  selectedLanguages,
  onLanguagesChange,
  availableLanguages,
  languageCounts = {},
}: LanguageFilterModalProps) {
  const [tempSelected, setTempSelected] = useState<string[]>(selectedLanguages);

  useEffect(() => {
    if (visible) {
      setTempSelected(selectedLanguages);
    }
  }, [visible, selectedLanguages]);

  const languagesToShow = LANGUAGES.filter((lang) =>
    availableLanguages.includes(lang.name)
  ).sort((a, b) => {
    // Sort by count (most to least)
    const countA = languageCounts[a.name] ?? 0;
    const countB = languageCounts[b.name] ?? 0;
    return countB - countA;
  });

  const toggleLanguage = (langName: string) => {
    if (tempSelected.includes(langName)) {
      setTempSelected(tempSelected.filter((l) => l !== langName));
    } else {
      setTempSelected([...tempSelected, langName]);
    }
  };

  const handleDone = () => {
    onLanguagesChange(tempSelected);
    onClose();
  };

  const handleCancel = () => {
    setTempSelected(selectedLanguages);
    onClose();
  };

  const handleSelectAll = () => {
    setTempSelected(availableLanguages);
  };

  const handleClearAll = () => {
    setTempSelected([]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter by Language</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleSelectAll}>
              <Text style={styles.quickActionText}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleClearAll}>
              <Text style={styles.quickActionText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={languagesToShow}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => {
              const isSelected = tempSelected.includes(item.name);
              const count = languageCounts[item.name] ?? 0;
              return (
                <TouchableOpacity
                  style={styles.languageRow}
                  onPress={() => toggleLanguage(item.name)}
                >
                  <View style={styles.languageLeft}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                    </View>
                    <Text style={styles.languageEmoji}>{item.flag}</Text>
                    <Text style={styles.languageText}>{item.name}</Text>
                  </View>
                  {count > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            style={styles.languageList}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={handleCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalDone} onPress={handleDone}>
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 440,
    maxHeight: '70%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  quickActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  quickActionText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  languageList: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 44,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  languageEmoji: {
    fontSize: 20,
  },
  languageText: {
    fontSize: 16,
    color: Colors.text,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  modalDone: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalDoneText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
