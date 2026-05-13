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
import { useNavigation } from '@react-navigation/native';
import { GOOGLE_SEARCH_URL } from '../constants/urls';

export default function WordsScreen() {
  const navigation = useNavigation<any>();
  const { words, deleteWord, setWebUrl } = useStore();
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

  const handleGoogleWord = () => {
    if (!selectedWord) return;
    setWebUrl(`${GOOGLE_SEARCH_URL}&q=define+${encodeURIComponent(selectedWord)}`);
    navigation.navigate('Web');
  };

  const handleWiktionaryWord = () => {
    if (!selectedWord) return;
    const url = `https://en.wiktionary.org/wiki/${encodeURIComponent(selectedWord)}`;
    setWebUrl(url);
    navigation.navigate('Web');
  };

  const renderWord = ({ item }: { item: WordEntry }) => (
    <TouchableOpacity
      style={[styles.card, isWide && styles.cardWide]}
      onPress={() => setSelectedWord(item.word)}
      onLongPress={() => handleDeleteWord(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardRow}>
        <Text style={styles.flag}>{getFlagForLanguage(item.language)}</Text>
        <View style={styles.cardContent}>
          <HighlightedText
            text={item.word}
            query={searchQuery}
            style={styles.cardWordText}
          />
          {item.pronunciation ? (
            <HighlightedText
              text={`/${item.pronunciation}/`}
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
    </TouchableOpacity>
  );

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
      {selectedWord && (
        <View style={styles.wordPanel}>
          <View style={styles.wordHeader}>
            <Text style={styles.wordText}>{selectedWord}</Text>
            <TouchableOpacity onPress={() => setSelectedWord(null)}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.wordActions}>
            <TouchableOpacity style={styles.wordBtn} onPress={handleGoogleWord}>
              <Ionicons name="logo-google" size={18} color={Colors.white} />
              <Text style={styles.wordBtnText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.wordBtn} onPress={handleWiktionaryWord}>
              <Ionicons name="book-outline" size={18} color={Colors.white} />
              <Text style={styles.wordBtnText}>Wiktionary</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  wordPanel: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  wordText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  wordActions: {
    flexDirection: 'row',
    gap: 10,
  },
  wordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  wordBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
