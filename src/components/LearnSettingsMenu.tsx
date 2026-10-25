import { Ionicons } from '@expo/vector-icons';
import React, { useState, type ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LANGUAGES } from '../constants/languages';
import { Colors } from '../constants/theme';
import { LearnLyricsLine, type LearnLine } from './LearnLyricsView';
import { Text } from './Text';

interface LearnSettingsMenuProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
  availableLanguages: string[];
  showIpa: boolean;
  onShowIpaChange: (show: boolean) => void;
  showEmoji: boolean;
  onShowEmojiChange: (show: boolean) => void;
  blurTranslations: boolean;
  onToggleBlur: () => void;
  showMasteryLevelColors: boolean;
  onToggleShowMasteryLevelColors: () => void;
  showSections: boolean;
  onToggleShowSections: () => void;
  onCopySections: () => Promise<unknown>;
  previewLine: LearnLine | null;
  previewLineIndex: number;
  fontSize: number;
  showTranslations: boolean;
  renderPressableText: (text: string, lineIndex: number) => ReactNode;
}

const NO_UNBLURRED = new Set<string>();

// Shown when the song has no saved words with an emoji or IPA to preview
const SAMPLE_WORDS = [
  { text: 'Bonjour', emoji: '👋', ipa: '/bɔ̃.ʒuʁ/', color: Colors.masteryLearning },
  { text: 'le', emoji: '', ipa: '/lə/', color: Colors.masteryMastered },
  { text: 'monde', emoji: '🌍', ipa: '/mɔ̃d/', color: Colors.masteryNew },
];

function SamplePreview({
  showIpa,
  showEmoji,
  showMasteryLevelColors,
  blurTranslations,
  showTranslations,
}: {
  showIpa: boolean;
  showEmoji: boolean;
  showMasteryLevelColors: boolean;
  blurTranslations: boolean;
  showTranslations: boolean;
}) {
  return (
    <View>
      <View style={styles.sampleLine}>
        {SAMPLE_WORDS.map((word) => (
          <View key={word.text} style={styles.sampleWord}>
            <View style={styles.sampleAnnotations}>
              {showEmoji && !!word.emoji && <Text style={styles.sampleAnnotation}>{word.emoji}</Text>}
              {showIpa && <Text style={styles.sampleAnnotation}>{word.ipa}</Text>}
            </View>
            <Text style={{ fontSize: 18, color: showMasteryLevelColors ? word.color : Colors.text }}>
              {word.text}
            </Text>
          </View>
        ))}
      </View>
      {showTranslations && (
        <View style={[styles.sampleTranslation, blurTranslations && styles.sampleTranslationBlurred]}>
          <Text style={[{ fontSize: 15, color: Colors.primaryLight }, blurTranslations && styles.blurredText]}>
            Hello world
          </Text>
        </View>
      )}
    </View>
  );
}

function Chip({ label, icon, selected, onPress }: {
  label: string;
  icon?: ReactNode;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      {icon}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Tile({ label, icon, on, onPress }: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.tile, on && styles.tileOn]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={on ? Colors.primaryLight : Colors.textSecondary} />
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileState}>{on ? 'On' : 'Off'}</Text>
    </TouchableOpacity>
  );
}

export default function LearnSettingsMenu({
  visible,
  onClose,
  onEdit,
  selectedLanguages,
  onLanguagesChange,
  availableLanguages,
  showIpa,
  onShowIpaChange,
  showEmoji,
  onShowEmojiChange,
  blurTranslations,
  onToggleBlur,
  showMasteryLevelColors,
  onToggleShowMasteryLevelColors,
  showSections,
  onToggleShowSections,
  onCopySections,
  previewLine,
  previewLineIndex,
  fontSize,
  showTranslations,
  renderPressableText,
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

  const [copiedSections, setCopiedSections] = useState(false);
  const copySections = async () => {
    await onCopySections();
    setCopiedSections(true);
    setTimeout(() => setCopiedSections(false), 2000);
  };

  const chipIconColor = (selected: boolean) => (selected ? Colors.primaryLight : Colors.textSecondary);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Learn Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close Learn settings">
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Live preview of the lyrics with the current settings */}
            <View style={styles.preview} pointerEvents="none">
              {previewLine ? (
                <LearnLyricsLine
                  lines={[]}
                  line={previewLine}
                  lineIndex={previewLineIndex}
                  fontSize={fontSize}
                  showTranslations={showTranslations}
                  selectedLanguages={selectedLanguages}
                  blurTranslations={blurTranslations}
                  unblurredTranslations={NO_UNBLURRED}
                  renderPressableText={renderPressableText}
                  onTranslationPress={() => {}}
                />
              ) : (
                <SamplePreview
                  showIpa={showIpa}
                  showEmoji={showEmoji}
                  showMasteryLevelColors={showMasteryLevelColors}
                  blurTranslations={blurTranslations}
                  showTranslations={showTranslations}
                />
              )}
            </View>

            <Text style={styles.sectionTitle}>Above Words</Text>
            <View style={styles.chips}>
              <Chip
                label="Emoji"
                icon={<Ionicons name="happy-outline" size={18} color={chipIconColor(showEmoji)} />}
                selected={showEmoji}
                onPress={() => onShowEmojiChange(!showEmoji)}
              />
              <Chip
                label="IPA"
                icon={<Ionicons name="volume-medium-outline" size={18} color={chipIconColor(showIpa)} />}
                selected={showIpa}
                onPress={() => onShowIpaChange(!showIpa)}
              />
            </View>

            {languagesToShow.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Translations</Text>
                <View style={styles.chips}>
                  {languagesToShow.map((lang) => (
                    <Chip
                      key={lang.code}
                      label={lang.name}
                      icon={<Text style={styles.flag}>{lang.flag}</Text>}
                      selected={selectedLanguages.includes(lang.name)}
                      onPress={() => toggleLanguage(lang.name)}
                    />
                  ))}
                </View>
              </>
            )}

            <Text style={styles.sectionTitle}>Lyrics</Text>
            <View style={styles.chips}>
              <Chip
                label="Song sections"
                icon={<Ionicons name="albums-outline" size={18} color={chipIconColor(showSections)} />}
                selected={showSections}
                onPress={onToggleShowSections}
              />
              {/* Debug: copy the detected sections to check them */}
              <Chip
                label={copiedSections ? 'Copied' : 'Copy sections'}
                icon={<Ionicons name={copiedSections ? 'checkmark' : 'copy-outline'} size={18} color={Colors.textSecondary} />}
                selected={false}
                onPress={copySections}
              />
            </View>

            <View style={styles.tiles}>
              <Tile label="Blur translations" icon="eye-off-outline" on={blurTranslations} onPress={onToggleBlur} />
              <Tile
                label="Mastery colors"
                icon="color-palette-outline"
                on={showMasteryLevelColors}
                onPress={onToggleShowMasteryLevelColors}
              />
            </View>

            <TouchableOpacity style={styles.editButton} onPress={() => { onEdit(); onClose(); }}>
              <Ionicons name="create-outline" size={20} color={Colors.text} />
              <Text style={styles.editButtonText}>Edit song</Text>
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
    width: '90%',
    maxWidth: 440,
    maxHeight: '85%',
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
  scrollContent: {
    padding: 20,
    paddingTop: 16,
  },
  preview: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 18,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipSelected: {
    backgroundColor: 'rgba(108, 92, 231, 0.18)',
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.text,
  },
  flag: {
    fontSize: 16,
  },
  tiles: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  tile: {
    flex: 1,
    gap: 6,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: Colors.surfaceLight,
  },
  tileOn: {
    backgroundColor: 'rgba(108, 92, 231, 0.18)',
    borderColor: Colors.primary,
  },
  tileLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 4,
  },
  tileState: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editButtonText: {
    fontSize: 15,
    color: Colors.text,
  },
  sampleLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sampleWord: {
    alignItems: 'center',
  },
  sampleAnnotations: {
    minHeight: 14,
    marginBottom: -6,
    flexDirection: 'row',
    gap: 4,
  },
  sampleAnnotation: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  sampleTranslation: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginHorizontal: -4,
    paddingHorizontal: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  sampleTranslationBlurred: {
    backgroundColor: Colors.surfaceLight,
  },
  blurredText: {
    filter: 'blur(5px)',
  },
});
