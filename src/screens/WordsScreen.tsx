import React, { useState, useRef } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Text, TextInput } from '../components/Text';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { isWordIgnored, useStore } from '../store/useStore';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { WordEntry } from '../types';
import ScreenWrapper from '../components/ScreenWrapper';
import { useIsWide } from '../hooks/useLayout';
import { useBackToQuit } from '../hooks/useBackToQuit';
import Toast from '../components/Toast';
import WordCard from '../components/WordCard';
import LanguageTabButtons from '../components/LanguageTabButtons';
import { countWordOccurrences, WordFrequency } from '../utils/wordFrequency';

interface PendingDeletion {
  id: string;
  item: WordEntry;
}

export default function WordsScreen() {
  const { words, deleteWord, songs, ignoredWords } = useStore();
  const navigation = useNavigation<any>();
  const [showFrequency, setShowFrequency] = useState(false);
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

  // Words in saved lyrics sorted by occurrences, excluding ignored words
  const wordFrequencies = React.useMemo(
    () => (showFrequency ? countWordOccurrences(songs, (w, lang) => isWordIgnored(ignoredWords, w, lang)) : []),
    [showFrequency, songs, ignoredWords],
  );

  // Get all unique languages from words and count occurrences
  const { availableLanguages, languageCounts } = React.useMemo(() => {
    const counts: Record<string, number> = {};
    (showFrequency ? wordFrequencies : words).forEach((word) => {
      counts[word.language] = (counts[word.language] ?? 0) + 1;
    });
    return {
      availableLanguages: Object.keys(counts).sort(),
      languageCounts: counts,
    };
  }, [words, wordFrequencies, showFrequency]);

  const searchedFrequencies = wordFrequencies.filter(
    (w) =>
      (selectedLanguages.length === 0 || selectedLanguages.includes(w.language)) &&
      (!searchQuery.trim() || w.word.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const renderFrequencyItem = ({ item, index }: { item: WordFrequency; index: number }) => {
    const savedWord = words.find((w) => w.word.toLowerCase() === item.word.toLowerCase() && w.language === item.language);
    return (
      <TouchableOpacity
        style={styles.frequencyRow}
        onPress={() => navigation.navigate('WordLookup', { word: item.word, originalLanguages: [item.language], source: 'Words' })}
      >
        <Text style={styles.frequencyRank}>{index + 1}</Text>
        <Text
          style={[styles.frequencyWord, savedWord?.masteryLevel && { color: getMasteryLevelColor(savedWord.masteryLevel) }]}
          numberOfLines={1}
        >
          {item.word}
        </Text>
        <Text style={styles.frequencySongs}>
          {item.songCount} {item.songCount === 1 ? 'song' : 'songs'}
        </Text>
        <Text style={styles.frequencyCount}>×{item.count}</Text>
      </TouchableOpacity>
    );
  };

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
      style={[styles.searchInput, { opacity: showSearch ? 1 : 0 }]}
      placeholder="Search by word or language..."
      placeholderTextColor={Colors.textMuted}
      value={searchQuery}
      onChangeText={setSearchQuery}
      autoFocus
    />
  );

  const languageTabsToggle = (
    <TouchableOpacity onPress={() => setShowLanguageTabs(!showLanguageTabs)} style={styles.toggleButtons}>
      <Ionicons
        name="language-outline"
        size={22}
        color={selectedLanguages.length > 0 ? Colors.primary : Colors.textMuted}
      />
    </TouchableOpacity>
  );

  const openSearchButton = (
    <TouchableOpacity
      onPress={toggleSearch}
      style={[styles.toggleButtons, showSearch ? styles.closeSearchButton : styles.openSearchButton]}
    >
      <Ionicons name={showSearch ? 'close' : 'search'} size={22} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  const frequencyToggle = (
    <TouchableOpacity
      accessibilityLabel="Toggle Word Frequency"
      onPress={() => {
        setShowFrequency((v) => !v);
        setSelectedLanguages([]);
      }}
      style={styles.toggleButtons}
    >
      <Ionicons name="stats-chart-outline" size={22} color={showFrequency ? Colors.primary : Colors.textMuted} />
    </TouchableOpacity>
  );

  const title = (
    <Text style={[styles.title, showSearch && { opacity: 0 }]}>{showFrequency ? 'Top Words' : 'Saved Words'}</Text>
  );

  return (
    <ScreenWrapper>
      <View style={styles.titleRow}>
        {searchInput}
        {title}
        {openSearchButton}
        {frequencyToggle}
        {languageTabsToggle}
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
      {showFrequency ? (
        searchedFrequencies.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="stats-chart-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {wordFrequencies.length === 0 ? 'No saved lyrics yet.' : 'No words match your filters.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={searchedFrequencies}
            keyExtractor={(item) => `${item.language}-${item.word}`}
            renderItem={renderFrequencyItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            initialNumToRender={30}
          />
        )
      ) : searchedWords.length === 0 ? (
        <View style={styles.empty}>
          {words.length === 0 ? (
            <>
              <Ionicons name="book-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No saved words yet.{'\n'}Tap words in Learn to look them up!</Text>
            </>
          ) : (
            <>
              <Ionicons name="search-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>
                {selectedLanguages.length > 0 || searchQuery.trim()
                  ? 'No words match your filters.'
                  : 'No words match your search.'}
              </Text>
            </>
          )}
        </View>
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
  toggleButtons: {
    padding: 4,
  },
  openSearchButton: {
    marginRight: 0,
  },
  closeSearchButton: {
    marginLeft: -42,
    marginRight: 16,
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
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
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
  frequencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  frequencyRank: {
    minWidth: 28,
    fontSize: 13,
    color: Colors.textMuted,
  },
  frequencyWord: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  frequencySongs: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  frequencyCount: {
    minWidth: 40,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primaryLight,
  },
});
