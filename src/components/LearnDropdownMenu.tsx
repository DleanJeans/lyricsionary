import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { LANGUAGES } from '../constants/languages';
import { DisplayMode } from './WordCard';

interface LearnDropdownMenuProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
  availableLanguages: string[];
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
}

export default function LearnDropdownMenu({
  visible,
  onClose,
  onEdit,
  selectedLanguages,
  onLanguagesChange,
  availableLanguages,
  displayMode,
  onDisplayModeChange,
}: LearnDropdownMenuProps) {
  const languagesToShow = LANGUAGES.filter((lang) =>
    availableLanguages.includes(lang.name)
  );

  const toggleLanguage = (langName: string) => {
    if (selectedLanguages.includes(langName)) {
      onLanguagesChange(selectedLanguages.filter((l) => l !== langName));
    } else {
      onLanguagesChange([...selectedLanguages, langName]);
    }
  };

  const handleDone = () => {
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Learn Options</Text>

          {/* Edit Button */}
          <TouchableOpacity style={styles.editButton} onPress={() => { onEdit(); onClose(); }}>
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
            <Text style={styles.editButtonText}>Edit Song</Text>
          </TouchableOpacity>

          {/* Translation Languages Section */}
          {languagesToShow.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Translation Languages</Text>
              <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
                {languagesToShow.map((lang) => {
                  const isSelected = selectedLanguages.includes(lang.name);
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={[styles.languageItem, isSelected && styles.languageItemSelected]}
                      onPress={() => toggleLanguage(lang.name)}
                    >
                      <Text style={styles.languageItemEmoji}>{lang.flag}</Text>
                      <Text style={[styles.languageItemText, isSelected && styles.languageItemTextSelected]}>
                        {lang.name}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Display Mode Section */}
          <Text style={styles.sectionTitle}>Display Above Saved Words</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioItem}
              onPress={() => onDisplayModeChange('emoji')}
            >
              <View style={styles.radioButton}>
                {displayMode === 'emoji' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.radioText}>Emoji</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioItem}
              onPress={() => onDisplayModeChange('ipa')}
            >
              <View style={styles.radioButton}>
                {displayMode === 'ipa' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.radioText}>IPA</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioItem}
              onPress={() => onDisplayModeChange('definition')}
            >
              <View style={styles.radioButton}>
                {displayMode === 'definition' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.radioText}>Definition</Text>
            </TouchableOpacity>
          </View>

          {/* Done Button */}
          <View style={styles.modalActions}>
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    marginBottom: 16,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 12,
  },
  languageList: {
    maxHeight: 200,
    marginBottom: 16,
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
  languageItemEmoji: {
    fontSize: 22,
  },
  languageItemText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  languageItemTextSelected: {
    fontWeight: '600',
    color: Colors.primary,
  },
  radioGroup: {
    gap: 12,
    marginBottom: 16,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  radioText: {
    fontSize: 16,
    color: Colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
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
});
