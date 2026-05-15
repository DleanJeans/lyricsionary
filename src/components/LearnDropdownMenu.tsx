import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { LANGUAGES } from '../constants/languages';
import { DisplayMode } from '../screens/LearnScreen';

interface LearnDropdownMenuProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
  availableLanguages: string[];
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  showEmoji: boolean;
  onShowEmojiChange: (show: boolean) => void;
  enableAnnotations: boolean;
  onEnableAnnotationsChange: (enable: boolean) => void;
  blurTranslations: boolean;
  onToggleBlur: () => void;
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
  showEmoji,
  onShowEmojiChange,
  enableAnnotations,
  onEnableAnnotationsChange,
  blurTranslations,
  onToggleBlur,
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

          {/* Blur Toggle */}
          <TouchableOpacity
            style={styles.blurToggle}
            onPress={onToggleBlur}
          >
            <View style={styles.blurToggleLeft}>
              <Ionicons
                name={blurTranslations ? 'eye-outline' : 'eye-off'}
                size={20}
                color={Colors.text}
              />
              <Text style={styles.blurToggleText}>Blur Translations</Text>
            </View>
            <View style={[styles.switch, blurTranslations && styles.switchActive]}>
              <View style={[styles.switchThumb, blurTranslations && styles.switchThumbActive]} />
            </View>
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
                      style={styles.languageItem}
                      onPress={() => toggleLanguage(lang.name)}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color={Colors.white} />}
                      </View>
                      <Text style={styles.languageItemEmoji}>{lang.flag}</Text>
                      <Text style={styles.languageItemText}>
                        {lang.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Display Mode Section */}
          <Text style={styles.sectionTitle}>Display Above Original Words</Text>

          {/* Master Toggle */}
          <TouchableOpacity
            style={styles.masterToggle}
            onPress={() => onEnableAnnotationsChange(!enableAnnotations)}
          >
            <View style={styles.masterToggleLeft}>
              <Text style={styles.masterToggleText}>Enable</Text>
            </View>
            <View style={[styles.switch, enableAnnotations && styles.switchActive]}>
              <View style={[styles.switchThumb, enableAnnotations && styles.switchThumbActive]} />
            </View>
          </TouchableOpacity>

          {/* Emoji Checkbox */}
          <TouchableOpacity
            style={styles.checkboxItem}
            onPress={() => onShowEmojiChange(!showEmoji)}
            disabled={!enableAnnotations}
          >
            <View style={[styles.checkbox, showEmoji && styles.checkboxSelected, !enableAnnotations && styles.checkboxDisabled]}>
              {showEmoji && <Ionicons name="checkmark" size={16} color={Colors.white} />}
            </View>
            <Text style={[styles.checkboxText, !enableAnnotations && styles.disabledText]}>Emoji</Text>
          </TouchableOpacity>

          {/* IPA and Definition Radios */}
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioItem}
              onPress={() => onDisplayModeChange('ipa')}
              disabled={!enableAnnotations}
            >
              <View style={[styles.radioButton, !enableAnnotations && styles.radioButtonDisabled]}>
                {displayMode === 'ipa' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={[styles.radioText, !enableAnnotations && styles.disabledText]}>IPA</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioItem}
              onPress={() => onDisplayModeChange('definition')}
              disabled={!enableAnnotations}
            >
              <View style={[styles.radioButton, !enableAnnotations && styles.radioButtonDisabled]}>
                {displayMode === 'definition' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={[styles.radioText, !enableAnnotations && styles.disabledText]}>Definition</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioItem}
              onPress={() => onDisplayModeChange('none')}
              disabled={!enableAnnotations}
            >
              <View style={[styles.radioButton, !enableAnnotations && styles.radioButtonDisabled]}>
                {displayMode === 'none' && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={[styles.radioText, !enableAnnotations && styles.disabledText]}>None</Text>
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
  blurToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    marginBottom: 16,
  },
  blurToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  blurToggleText: {
    fontSize: 16,
    color: Colors.text,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: Colors.primary,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignSelf: 'flex-start',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    marginBottom: 12,
    marginHorizontal: 12,
  },
  masterToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  masterToggleText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  checkboxText: {
    fontSize: 16,
    color: Colors.text,
  },
  checkboxDisabled: {
    opacity: 0.4,
  },
  radioButtonDisabled: {
    opacity: 0.4,
  },
  disabledText: {
    opacity: 0.4,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
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
  languageItemEmoji: {
    fontSize: 22,
  },
  languageItemText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  radioGroup: {
    marginBottom: 16,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
