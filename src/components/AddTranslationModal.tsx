import React, { useEffect, useState } from 'react';
import { FlatList, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchLanguages } from '../constants/languages';
import { Colors } from '../constants/theme';
import LanguageSearchInput from './LanguageSearchInput';
import { Text } from './Text';

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

interface AddTranslationModalProps {
  visible: boolean;
  languages: LanguageOption[];
  selectedLanguage: string;
  onSelectLanguage: (language: string) => void;
  onCancel: () => void;
  onAdd: () => void;
}

export default function AddTranslationModal({
  visible,
  languages,
  selectedLanguage,
  onSelectLanguage,
  onCancel,
  onAdd,
}: AddTranslationModalProps) {
  const [query, setQuery] = useState('');

  // Start each opening with an empty search
  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Translation</Text>
          <LanguageSearchInput value={query} onChangeText={setQuery} />
          <FlatList
            data={searchLanguages(languages, query)}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.code}
            style={styles.languageList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.languageItem,
                  selectedLanguage === item.name && styles.languageItemSelected,
                ]}
                onPress={() => onSelectLanguage(item.name)}
              >
                <Text style={styles.languageFlag}>{item.flag}</Text>
                <Text style={styles.languageName}>{item.name}</Text>
                {selectedLanguage === item.name && (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={Colors.primary}
                  />
                )}
              </TouchableOpacity>
            )}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={onCancel}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalAdd}
              onPress={onAdd}
            >
              <Text style={styles.modalAddText}>Add</Text>
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
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 440,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  languageList: {
    maxHeight: 300,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  languageItemSelected: {
    backgroundColor: Colors.surfaceLight,
  },
  languageFlag: {
    fontSize: 22,
  },
  languageName: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
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
  modalAdd: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  modalAddText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
