import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, Modal, FlatList, StyleSheet, TextInput } from 'react-native';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { LANGUAGES, getSortedLanguages, Language } from '../constants/languages';

interface LanguageSelectProps {
  // Common props
  placeholder?: string;
  availableLanguages?: string[];
  showModal?: boolean;
  hideInput?: boolean;
  onClose?: () => void;
  modalTitle?: string;

  // Button text props
  cancelButtonText?: string;
  confirmButtonText?: string;

  // Single select mode props (when multiSelect is false or undefined)
  value?: string;
  onValueChange?: (language: string) => void;

  // Multi select mode props (when multiSelect is true)
  multiSelect?: boolean;
  values?: string[];
  onValuesChange?: (languages: string[]) => void;

  // Sorting languages by usage
  songLanguages?: string[];
}

export default function LanguageSelect({
  placeholder,
  availableLanguages,
  showModal: externalShowModal,
  hideInput,
  onClose,
  modalTitle,
  cancelButtonText = 'Cancel',
  confirmButtonText,
  value,
  onValueChange,
  multiSelect = false,
  values = [],
  onValuesChange,
  songLanguages,
}: LanguageSelectProps) {
  const [internalShowModal, setInternalShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Single select state
  const [selectedLanguage, setSelectedLanguage] = useState(value || '');

  // Multi select state
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(values);

  // Use external control if provided, otherwise use internal state
  const showModal = externalShowModal !== undefined ? externalShowModal : internalShowModal;

  // Update state when value/values prop changes
  React.useEffect(() => {
    if (multiSelect) {
      setSelectedLanguages(values);
    } else {
      setSelectedLanguage(value || '');
    }
  }, [value, values, multiSelect]);

  // Get sorted and filtered languages
  const sortedLanguages = useMemo(() => {
    return getSortedLanguages(songLanguages);
  }, [songLanguages]);

  // Filter languages based on availableLanguages prop and search query
  const filteredLanguages = useMemo(() => {
    let langs = availableLanguages
      ? sortedLanguages.filter((lang) => availableLanguages.includes(lang.name))
      : sortedLanguages;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      langs = langs.filter((lang) =>
        lang.name.toLowerCase().includes(query) ||
        lang.native.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query)
      );
    }

    return langs;
  }, [sortedLanguages, availableLanguages, searchQuery]);

  const handleConfirm = () => {
    if (multiSelect) {
      if (onValuesChange) {
        onValuesChange(selectedLanguages);
      }
    } else {
      if (onValueChange) {
        onValueChange(selectedLanguage);
      }
    }

    setSearchQuery(''); // Clear search on close
    if (onClose) {
      onClose();
    } else {
      setInternalShowModal(false);
    }
  };

  const handleCancel = () => {
    // Reset to original value
    if (multiSelect) {
      setSelectedLanguages(values);
    } else {
      setSelectedLanguage(value || '');
    }

    setSearchQuery(''); // Clear search on close
    if (onClose) {
      onClose();
    } else {
      setInternalShowModal(false);
    }
  };

  const handleOpen = () => {
    if (multiSelect) {
      setSelectedLanguages(values);
    } else {
      setSelectedLanguage(value || '');
    }
    setSearchQuery(''); // Clear search on open
    setInternalShowModal(true);
  };

  const toggleLanguage = (langName: string) => {
    if (multiSelect) {
      if (selectedLanguages.includes(langName)) {
        setSelectedLanguages(selectedLanguages.filter((l) => l !== langName));
      } else {
        setSelectedLanguages([...selectedLanguages, langName]);
      }
    } else {
      setSelectedLanguage(langName);
    }
  };

  const getDisplayText = () => {
    if (multiSelect) {
      if (values.length === 0) {
        return placeholder || 'Select Languages';
      }
      const flags = values
        .map((langName) => LANGUAGES.find((l) => l.name === langName)?.flag)
        .filter(Boolean)
        .join(' ');
      return flags;
    } else {
      if (!value) {
        return placeholder || 'Select Language';
      }
      const selectedLang = LANGUAGES.find(l => l.name === value);
      return selectedLang ? `${selectedLang.flag} ${selectedLang.name}` : value;
    }
  };

  const isSelected = (langName: string) => {
    if (multiSelect) {
      return selectedLanguages.includes(langName);
    }
    return selectedLanguage === langName;
  };

  // Determine default modal title and confirm button text
  const defaultModalTitle = multiSelect
    ? 'Select Original Languages'
    : 'Select Language';
  const defaultConfirmText = multiSelect ? 'Done' : 'Select';

  return (
    <>
      {!hideInput && (
        <TouchableOpacity
          style={multiSelect ? styles.selectButtonMulti : styles.selectButton}
          onPress={handleOpen}
        >
          <Text style={[
            styles.selectText,
            (multiSelect ? values.length === 0 : !value) && styles.selectPlaceholder
          ]}>
            {getDisplayText()}
          </Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      )}

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalTitle || defaultModalTitle}</Text>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search languages..."
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
                  <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredLanguages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const selected = isSelected(item.name);
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, selected && styles.modalItemSelected]}
                    onPress={() => toggleLanguage(item.name)}
                  >
                    <Text style={styles.modalItemEmoji}>{item.flag}</Text>
                    <View style={styles.modalItemTextContainer}>
                      <Text style={[styles.modalItemText, selected && styles.modalItemTextSelected]}>
                        {item.name}
                      </Text>
                      {item.native !== item.name && (
                        <Text style={styles.modalItemNative}>{item.native}</Text>
                      )}
                    </View>
                    {selected && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              }}
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No languages found</Text>
                </View>
              }
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={handleCancel}>
                <Text style={styles.modalCancelText}>{cancelButtonText}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalAdd} onPress={handleConfirm}>
                <Text style={styles.modalAddText}>{confirmButtonText || defaultConfirmText}</Text>
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
  selectButtonMulti: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 14,
  },
  selectText: {
    fontSize: 16,
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
    maxWidth: 440,
    maxHeight: '80%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    padding: 0,
  },
  searchClear: {
    padding: 4,
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  modalItemSelected: {
    backgroundColor: Colors.surfaceLight,
  },
  modalItemEmoji: {
    fontSize: 22,
  },
  modalItemTextContainer: {
    flex: 1,
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  modalItemTextSelected: {
    fontWeight: '600',
    color: Colors.primary,
  },
  modalItemNative: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
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
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalAddText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
