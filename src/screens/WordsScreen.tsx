import React, { useState, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Text, TextInput } from '../components/Text';
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
import EmptyState from '../components/EmptyState';
import IconButton from '../components/IconButton';
import { countWordOccurrences, WordFrequency } from '../utils/wordFrequency';

interface PendingDeletion {
  id: string;
  item: WordEntry;
}

export default function WordsScreen() {
  const navigation = useNavigation<any>();
  const words = useStore((s) => s.words);
  const deleteWord = useStore((s) => s.deleteWord);
  const songs = useStore((s) => s.songs);
  const ignoredWords = useStore((s) => s.ignoredWords);
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

  // Apply search filter: the word, its language, IPA or any of its meanings
  const query = searchQuery.trim().toLowerCase();
  const searchedWords = query
    ? languageFilteredWords.filter((w) =>
        [
          w.word,
          w.language,
          w.pronunciation,
          ...(w.definitions ?? []).map((d) => d.text),
          ...(w.contexts ?? []).map((c) => c.definition),
        ].some((text) => text?.toLowerCase().includes(query)),
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
      placeholder="Search by word, meaning or language..."
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

  const selectView = (frequency: boolean) => {
    if (frequency === showFrequency) return;
    setShowFrequency(frequency);
    setSelectedLanguages([]);
  };

  const viewSwitch = (
    <View style={styles.viewSwitch} accessibilityRole="tablist">
      {[
        { label: 'Saved', frequency: false },
        { label: 'Top', frequency: true },
      ].map(({ label, frequency }) => {
        const selected = showFrequency === frequency;
        return (
          <TouchableOpacity
            key={label}
            style={[styles.viewSwitchOption, selected && styles.viewSwitchOptionSelected]}
            onPress={() => selectView(frequency)}
            accessibilityRole="tab"
            accessibilityLabel={frequency ? 'Top words' : 'Saved words'}
            accessibilityState={{ selected }}
          >
            <Text style={[styles.viewSwitchLabel, selected && styles.viewSwitchLabelSelected]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <ScreenWrapper>
      <View style={styles.titleRow}>
        {openSearchButton}
        {showSearch ? searchInput : <View style={styles.titleCenter}>{viewSwitch}</View>}
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
          <EmptyState
            icon="stats-chart-outline"
            title={wordFrequencies.length === 0 ? 'No lyrics yet' : 'No words found'}
            message={wordFrequencies.length === 0 ? 'Save a song with lyrics to see its most frequent words.' : 'Try a different search or clear the active filters.'}
          />
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
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  titleCenter: {
    flex: 1,
    alignItems: 'center',
  },
  viewSwitch: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
  },
  viewSwitchOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 11,
  },
  viewSwitchOptionSelected: {
    backgroundColor: Colors.primary,
  },
  viewSwitchLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  viewSwitchLabelSelected: {
    color: Colors.text,
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
