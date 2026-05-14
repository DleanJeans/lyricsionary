import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Colors } from '../constants/theme';
import { getFlagForLanguage } from '../constants/languages';
import { WordEntry } from '../types';
import ScreenWrapper from '../components/ScreenWrapper';
import { useIsWide } from '../hooks/useLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import { useBackToQuit } from '../hooks/useBackToQuit';
import HighlightedText from '../components/HighlightedText';
import WordLookupButtons from '../components/WordLookupButtons';

export default function WordsScreen() {
  const { words, deleteWord } = useStore();
  const isWide = useIsWide();
  useBackToQuit();
  const numColumns = isWide ? 2 : 1;
  const sortedWords = [...words].sort((a, b) => b.lastLookedUp - a.lastLookedUp);
  const [wordToDelete, setWordToDelete] = useState<WordEntry | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const filteredWords = searchQuery.trim()
    ? sortedWords.filter(
        (w) =>
          w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (w.pronunciation && w.pronunciation.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : sortedWords;

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDeleteWord = (word: WordEntry) => {
    setWordToDelete(word);
  };

  const confirmDelete = () => {
    if (wordToDelete) {
      deleteWord(wordToDelete.id);
      setWordToDelete(null);
    }
  };

  const cancelDelete = () => {
    setWordToDelete(null);
  };

  const toggleSearch = () => {
    if (showSearch) setSearchQuery('');
    setShowSearch((v) => !v);
  };

  const renderWord = ({ item }: { item: WordEntry }) => {
    const isSelected = selectedWord === item.word;
    const ipa = item.pronunciation.includes('/') ? item.pronunciation : `/${item.pronunciation}/`;

    return (
      <TouchableOpacity
        style={[styles.card, isWide && styles.cardWide]}
        onPress={() => setSelectedWord(isSelected ? null : item.word)}
        onLongPress={() => handleDeleteWord(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <Text style={styles.flag}>{item.emoji || getFlagForLanguage(item.language)}</Text>
          <View style={styles.cardContent}>
            <HighlightedText
              text={item.word}
              query={searchQuery}
              style={styles.cardWordText}
            />
            {item.pronunciation ? (
              <HighlightedText
                text={ipa}
                query={searchQuery}
                style={styles.pronunciation}
              />
            ) : null}
          </View>
          <View style={styles.cardRight}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.lookupCount}×</Text>
            </View>
            <Text style={styles.date}>{formatDate(item.lastLookedUp)}</Text>
          </View>
        </View>
        {isSelected && (
          <View style={styles.buttonsContainer}>
            <WordLookupButtons word={item.word} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper>
      <View style={styles.titleRow}>
        {showSearch ? (
          <TextInput
            style={styles.searchInput}
            placeholder="Search by word or language..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        ) : (
          <Text style={styles.title}>Saved Words</Text>
        )}
        <TouchableOpacity onPress={toggleSearch} style={styles.searchButton}>
          <Ionicons
            name={showSearch ? 'close' : 'search'}
            size={22}
            color={Colors.textMuted}
          />
        </TouchableOpacity>
      </View>
      {filteredWords.length === 0 ? (
        <View style={styles.empty}>
          {words.length === 0 ? (
            <>
              <Ionicons name="book-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No saved words yet.{'\n'}Tap words in Learn to look them up!</Text>
            </>
          ) : (
            <>
              <Ionicons name="search-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No words match your search.</Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          key={numColumns}
          numColumns={numColumns}
          data={filteredWords}
          keyExtractor={(item) => item.id}
          renderItem={renderWord}
          columnWrapperStyle={isWide ? styles.row : undefined}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
      <ConfirmDialog
        visible={wordToDelete !== null}
        title={`Delete Word: ${wordToDelete?.word}`}
        message={`This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        destructive
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
  },
  searchButton: {
    padding: 4,
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
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardWide: {
    flex: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardWordText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  pronunciation: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  date: {
    fontSize: 12,
    color: Colors.textMuted,
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
  buttonsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
