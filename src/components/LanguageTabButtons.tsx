import React from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Colors } from '../constants/theme';
import { LANGUAGES } from '../constants/languages';

interface LanguageTabButtonsProps {
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
  availableLanguages: string[];
  languageCounts?: Record<string, number>;
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
      onLanguagesChange(selectedLanguages.filter((l) => l !== langName));
    } else {
      onLanguagesChange([...selectedLanguages, langName]);
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {languagesToShow.map((lang) => {
        const isSelected = selectedLanguages.includes(lang.name);
        const count = languageCounts[lang.name] ?? 0;

        return (
          <TouchableOpacity
            key={lang.code}
            style={[styles.tabButton, isSelected && styles.tabButtonSelected]}
            onPress={() => toggleLanguage(lang.name)}
            activeOpacity={0.7}
          >
            <Text style={styles.flag}>{lang.flag}</Text>
            <Text style={[styles.languageName, isSelected && styles.languageNameSelected]}>
              {lang.name}
            </Text>
            {count > 0 && (
              <View style={[styles.badge, isSelected && styles.badgeSelected]}>
                <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>
                  {count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
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
