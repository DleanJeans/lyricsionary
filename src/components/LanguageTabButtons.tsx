import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Colors } from '../constants/theme';
import { LANGUAGES } from '../constants/languages';

interface LanguageTabButtonsProps {
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
  availableLanguages: string[];
  languageCounts?: Record<string, number>;
}

interface LanguageFilterChipProps {
  language: (typeof LANGUAGES)[number];
  count: number;
  selected: boolean;
  onPress: () => void;
}

function LanguageFilterChip({
  language,
  count,
  selected,
  onPress,
}: LanguageFilterChipProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.tabButton,
        selected && styles.tabButtonSelected,
        pressed && styles.tabButtonPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={language.name + ' language filter'}
      accessibilityState={{ selected }}
    >
      <Text style={styles.flag}>{language.flag}</Text>
      <Text style={[styles.languageName, selected && styles.languageNameSelected]}>
        {language.name}
      </Text>
      {count > 0 && (
        <View style={[styles.badge, selected && styles.badgeSelected]}>
          <Text style={[styles.badgeText, selected && styles.badgeTextSelected]}>
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function LanguageTabButtons({
  selectedLanguages,
  onLanguagesChange,
  availableLanguages,
  languageCounts = {},
}: LanguageTabButtonsProps) {
  const languagesToShow = LANGUAGES.filter((lang) =>
    availableLanguages.includes(lang.name)
  ).sort((a, b) => {
    // Sort by count (most to least)
    const countA = languageCounts[a.name] ?? 0;
    const countB = languageCounts[b.name] ?? 0;
    return countB - countA;
  });

  const toggleLanguage = (langName: string) => {
    if (selectedLanguages.includes(langName)) {
      // Deselect if already selected
      onLanguagesChange([]);
    } else {
      // Select only this language (single selection)
      onLanguagesChange([langName]);
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {languagesToShow.map((language) => (
        <LanguageFilterChip
          key={language.code}
          language={language}
          count={languageCounts[language.name] ?? 0}
          selected={selectedLanguages.includes(language.name)}
          onPress={() => toggleLanguage(language.name)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 60,
  },
  contentContainer: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabButtonPressed: {
    opacity: 0.72,
  },
  flag: {
    fontSize: 18,
  },
  languageName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  languageNameSelected: {
    color: Colors.white,
  },
  badge: {
    backgroundColor: Colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextSelected: {
    color: Colors.white,
  },
});
