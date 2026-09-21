import React, { useState, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Text, TextInput } from '../components/Text';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { Colors } from '../constants/theme';
import { WordEntry } from '../types';
import ScreenWrapper from '../components/ScreenWrapper';
import { useIsWide } from '../hooks/useLayout';
import { useBackToQuit } from '../hooks/useBackToQuit';
import Toast from '../components/Toast';
import WordCard from '../components/WordCard';
import LanguageTabButtons from '../components/LanguageTabButtons';
import EmptyState from '../components/EmptyState';
import IconButton from '../components/IconButton';

interface PendingDeletion {
  id: string;
  item: WordEntry;
}

export default function WordsScreen() {
  const navigation = useNavigation<any>();
  const words = useStore((s) => s.words);
  const deleteWord = useStore((s) => s.deleteWord);
  const isWide = useIsWide();
  useBackToQuit();
  const numColumns = isWide ? 2 : 1;
  const sortedWords = [...words].sort((a, b) => b.lastLookedUp - a.lastLookedUp);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLanguageTabs, setShowLanguageTabs] = useState(true);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  const [pendingDeletions, setPendingDeletions] = useState<PendingDeletion[]>([]);
  const deleteTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Get all unique languages from words and count occurrences
  const { availableLanguages, languageCounts } = React.useMemo(() => {
    const counts: Record<string, number> = {};
    words.forEach((word) => {
      counts[word.language] = (counts[word.language] ?? 0) + 1;
    });
    return {
      availableLanguages: Object.keys(counts).sort(),
      languageCounts: counts,
    };
  }, [words]);

  const pendingIds = new Set(pendingDeletions.map(d => d.id));
  const filteredWords = sortedWords.filter(w => !pendingIds.has(w.id));

  // Apply language filter
  const languageFilteredWords =
    selectedLanguages.length > 0 ? filteredWords.filter((w) => selectedLanguages.includes(w.language)) : filteredWords;

  // Apply search filter
  const searchedWords = searchQuery.trim()
    ? languageFilteredWords.filter(
        (w) =>
          w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (w.pronunciation && w.pronunciation.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    : languageFilteredWords;

  const toggleSearch = () => {
    if (showSearch) setSearchQuery('');
    setShowSearch((v) => !v);
  };

  const handleDelete = (item: WordEntry, closeSwipeable: () => void) => {
    if (deleteTimeoutsRef.current[item.id]) return;
    setPendingDeletions(prev => [...prev, { id: item.id, item }]);
    closeSwipeable();
    deleteTimeoutsRef.current[item.id] = setTimeout(() => {
      deleteWord(item.id);
      setPendingDeletions(prev => prev.filter(d => d.id !== item.id));
      delete deleteTimeoutsRef.current[item.id];
    }, 5000);
  };

  const handleUndo = (itemId: string) => {
    if (deleteTimeoutsRef.current[itemId]) {
      clearTimeout(deleteTimeoutsRef.current[itemId]);
      delete deleteTimeoutsRef.current[itemId];
    }
    setPendingDeletions(prev => prev.filter(d => d.id !== itemId));
  };

  const searchInput = (
    <TextInput
      style={styles.searchInput}
      placeholder="Search by word or language..."
      placeholderTextColor={Colors.textMuted}
      value={searchQuery}
      onChangeText={setSearchQuery}
      autoFocus={showSearch}
    />
  );

  const languageTabsToggle = (
    <IconButton
      icon="language-outline"
      label={showLanguageTabs ? 'Hide language filters' : 'Show language filters'}
      onPress={() => setShowLanguageTabs(!showLanguageTabs)}
      selected={selectedLanguages.length > 0}
    />
  );

  const openSearchButton = (
    <IconButton
      icon={showSearch ? 'close' : 'search'}
      label={showSearch ? 'Close word search' : 'Open word search'}
      onPress={toggleSearch}
    />
  );

  return (
    <ScreenWrapper>
      <View style={styles.titleRow}>
        {showSearch ? searchInput : <Text style={styles.title}>Saved Words</Text>}
        <View style={styles.headerActions}>
          {openSearchButton}
          {languageTabsToggle}
        </View>
      </View>

      {showLanguageTabs && availableLanguages.length > 0 && (
        <View style={styles.languageTabsContainer}>
          <LanguageTabButtons
            selectedLanguages={selectedLanguages}
            onLanguagesChange={setSelectedLanguages}
            availableLanguages={availableLanguages}
            languageCounts={languageCounts}
          />
        </View>
      )}
      {searchedWords.length === 0 ? (
        words.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="Build your word bank"
            message="Tap a word in Learn to save its pronunciation and meaning."
            actionLabel="Open Learn"
            onAction={() => navigation.navigate('Learn')}
          />
        ) : (
          <EmptyState
            icon="search-outline"
            title="No words found"
            message="Try a different search or clear the active filters."
            actionLabel="Clear filters"
            onAction={() => {
              setSearchQuery('');
              setSelectedLanguages([]);
            }}
          />
        )
      ) : (
        <FlatList
          key={numColumns}
          numColumns={numColumns}
          data={searchedWords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WordCard
              item={item}
              isWide={isWide}
              searchQuery={searchQuery}
              showDelete={true}
              showClose={false}
              onDelete={handleDelete}
              source="Words"
            />
          )}
          columnWrapperStyle={isWide ? styles.row : undefined}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
      <View style={styles.toastStack} pointerEvents="box-none">
        {pendingDeletions.map((d) => (
          <Toast
            key={d.id}
            message={
              <>
                Deleted
                <Text style={{ fontWeight: 'bold' }}> {d.item.word}</Text>
              </>
            }
            onUndo={() => handleUndo(d.id)}
          />
        ))}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
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
  headerActions: {
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
    marginRight: 8,
  },
  list: {
    paddingBottom: 40,
  },
  row: {
    gap: 10,
  },
  toastStack: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    gap: 8,
    zIndex: 1000,
  },
  languageTabsContainer: {
    marginBottom: 12,
  },
});
