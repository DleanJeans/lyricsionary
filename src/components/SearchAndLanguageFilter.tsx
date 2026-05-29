import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, TextInput } from './Text';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import LanguageTabButtons from './LanguageTabButtons';

interface SearchAndLanguageFilterProps {
  // Title
  title: string;

  // Search state
  showSearch: boolean;
  searchQuery: string;
  searchPlaceholder: string;
  onSearchQueryChange: (query: string) => void;
  onToggleSearch: () => void;

  // Language filter state
  showLanguageTabs: boolean;
  selectedLanguages: string[];
  availableLanguages: string[];
  languageCounts: Record<string, number>;
  onLanguagesChange: (languages: string[]) => void;
  onToggleLanguageTabs: () => void;

  // Optional: Search in lyrics toggle (for SongsScreen)
  searchInLyrics?: boolean;
  onToggleSearchInLyrics?: () => void;

  // Optional: Left button (for sort, etc.)
  leftButton?: React.ReactNode;

  // Layout: which side has search, which has language
  searchOnLeft?: boolean;
}

export default function SearchAndLanguageFilter({
  title,
  showSearch,
  searchQuery,
  searchPlaceholder,
  onSearchQueryChange,
  onToggleSearch,
  showLanguageTabs,
  selectedLanguages,
  availableLanguages,
  languageCounts,
  onLanguagesChange,
  onToggleLanguageTabs,
  searchInLyrics,
  onToggleSearchInLyrics,
  leftButton,
  searchOnLeft = false,
}: SearchAndLanguageFilterProps) {
  const hasLyricsToggle = searchInLyrics !== undefined && onToggleSearchInLyrics !== undefined;

  const searchButton = (
    <TouchableOpacity
      onPress={onToggleSearch}
      style={styles.iconButton}
    >
      <Ionicons
        name={showSearch ? 'close' : 'search'}
        size={22}
        color={Colors.textMuted}
      />
    </TouchableOpacity>
  );

  const languageButton = (
    <TouchableOpacity
      onPress={onToggleLanguageTabs}
      style={styles.iconButton}
    >
      <Ionicons
        name="language-outline"
        size={22}
        color={selectedLanguages.length > 0 ? Colors.primary : Colors.textMuted}
      />
    </TouchableOpacity>
  );

  return (
    <>
      <View style={[styles.titleRow, showSearch && styles.titleRowWithSearch]}>
        {leftButton}
        {showSearch ? (
          <>
            <TextInput
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={onSearchQueryChange}
              autoFocus
            />
            <View style={styles.searchButtons}>
              {hasLyricsToggle && (
                <TouchableOpacity
                  onPress={onToggleSearchInLyrics}
                  style={styles.lyricsToggle}
                >
                  <Ionicons
                    name={searchInLyrics ? 'musical-notes' : 'musical-notes-outline'}
                    size={22}
                    color={searchInLyrics ? Colors.primary : Colors.textMuted}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onToggleSearch}>
                <Ionicons
                  name="close"
                  size={22}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Text style={styles.title}>{title}</Text>
        )}
        {!showSearch && (
          <View style={styles.rightButtons}>
            {searchOnLeft ? (
              <>
                {searchButton}
                {languageButton}
              </>
            ) : (
              <>
                {languageButton}
                {searchButton}
              </>
            )}
          </View>
        )}
      </View>

      {showLanguageTabs && availableLanguages.length > 0 && (
        <View style={styles.languageTabsContainer}>
          <LanguageTabButtons
            selectedLanguages={selectedLanguages}
            onLanguagesChange={onLanguagesChange}
            availableLanguages={availableLanguages}
            languageCounts={languageCounts}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 25 - 6.5,
  },
  titleRowWithSearch: {
    marginBottom: 12,
  },
  title: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
  },
  iconButton: {
    padding: 4,
    zIndex: 1,
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginLeft: 8,
  },
  searchButtons: {
    flexDirection: 'row',
    gap: 8,
    marginRight: 16,
    marginLeft: -60,
  },
  lyricsToggle: {
  },
  languageTabsContainer: {
    marginBottom: 12,
  },
});
