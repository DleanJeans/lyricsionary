import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { LANGUAGES } from '../constants/languages';
import { DisplayMode } from '../screens/LearnScreen';

interface LearnSettingsMenuProps {
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
  showMasteryLevelColors: boolean;
  onToggleShowMasteryLevelColors: () => void;
}

export default function LearnSettingsMenu({
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
  showMasteryLevelColors,
  onToggleShowMasteryLevelColors,
}: LearnSettingsMenuProps) {
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
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Learn Settings</Text>
            <TouchableOpacity onPress={handleDone} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Edit Button */}
            <TouchableOpacity style={styles.settingRow} onPress={() => { onEdit(); onClose(); }}>
              <View style={styles.settingLeft}>
                <Ionicons name="create-outline" size={20} color={Colors.text} />
                <Text style={styles.settingText}>Edit Song</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            {/* Blur Toggle */}
            <TouchableOpacity style={styles.settingRow} onPress={onToggleBlur}>
              <View style={styles.settingLeft}>
                <Ionicons
                  name='eye-outline'
                  size={20}
                  color={Colors.text}
                  style={{ filter: blurTranslations ? 'blur(2px)' : 'none' }}
                />
                <Text style={styles.settingText}>Blur Translations</Text>
              </View>
              <View style={[styles.switch, blurTranslations && styles.switchActive]}>
                <View style={[styles.switchThumb, blurTranslations && styles.switchThumbActive]} />
              </View>
            </TouchableOpacity>

            {/* Mastery Level Colors Toggle */}
            <TouchableOpacity style={styles.settingRow} onPress={onToggleShowMasteryLevelColors}>
              <View style={styles.settingLeft}>
                <Ionicons
                  name="color-palette-outline"
                  size={20}
                  color={Colors.text}
                />
                <Text style={styles.settingText}>Mastery Level Colors</Text>
              </View>
              <View style={[styles.switch, showMasteryLevelColors && styles.switchActive]}>
                <View style={[styles.switchThumb, showMasteryLevelColors && styles.switchThumbActive]} />
              </View>
            </TouchableOpacity>

            {/* Translation Languages Section */}
            {languagesToShow.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Translation Languages</Text>
                {languagesToShow.map((lang) => {
                  const isSelected = selectedLanguages.includes(lang.name);
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={styles.settingRow}
                      onPress={() => toggleLanguage(lang.name)}
                    >
                      <View style={styles.settingLeft}>
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                          {isSelected && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                        </View>
                        <Text style={styles.languageEmoji}>{lang.flag}</Text>
                        <Text style={styles.settingText}>{lang.name}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {/* Display Above Original Words Section */}
            <Text style={styles.sectionTitle}>Display Above Original Words</Text>

            {/* Master Toggle */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => onEnableAnnotationsChange(!enableAnnotations)}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingTextBold}>Enable</Text>
              </View>
              <View style={[styles.switch, enableAnnotations && styles.switchActive]}>
                <View style={[styles.switchThumb, enableAnnotations && styles.switchThumbActive]} />
              </View>
            </TouchableOpacity>

            {/* Emoji Checkbox */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => onShowEmojiChange(!showEmoji)}
              disabled={!enableAnnotations}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.checkbox, showEmoji && styles.checkboxSelected, !enableAnnotations && styles.checkboxDisabled]}>
                  {showEmoji && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                </View>
                <Text style={[styles.settingText, !enableAnnotations && styles.disabledText]}>Emoji</Text>
              </View>
            </TouchableOpacity>

            {/* IPA Radio */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => onDisplayModeChange('ipa')}
              disabled={!enableAnnotations}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.radioButton, !enableAnnotations && styles.radioButtonDisabled]}>
                  {displayMode === 'ipa' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={[styles.settingText, !enableAnnotations && styles.disabledText]}>IPA</Text>
              </View>
            </TouchableOpacity>

            {/* Definition Radio */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => onDisplayModeChange('definition')}
              disabled={!enableAnnotations}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.radioButton, !enableAnnotations && styles.radioButtonDisabled]}>
                  {displayMode === 'definition' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={[styles.settingText, !enableAnnotations && styles.disabledText]}>Definition</Text>
              </View>
            </TouchableOpacity>

            {/* None Radio */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => onDisplayModeChange('none')}
              disabled={!enableAnnotations}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.radioButton, !enableAnnotations && styles.radioButtonDisabled]}>
                  {displayMode === 'none' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={[styles.settingText, !enableAnnotations && styles.disabledText]}>None</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
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
  scrollView: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 44,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: Colors.text,
  },
  settingTextBold: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  languageEmoji: {
    fontSize: 20,
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
  checkboxDisabled: {
    opacity: 0.4,
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  radioButtonDisabled: {
    opacity: 0.4,
  },
  disabledText: {
    opacity: 0.4,
  },
});
