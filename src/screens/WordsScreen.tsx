import React, { useState, useRef } from 'react';
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
import { useBackToQuit } from '../hooks/useBackToQuit';
import HighlightedText from '../components/HighlightedText';
import WordLookupButtons from '../components/WordLookupButtons';
import Toast from '../components/Toast';
import { Swipeable } from 'react-native-gesture-handler';

interface WordRowProps {
  item: WordEntry;
  isWide: boolean;
  searchQuery: string;
  isSelected: boolean;
  onSelect: (word: string | null) => void;
  onDelete: (item: WordEntry, close: () => void) => void;
}

function WordRow({ item, isWide, searchQuery, isSelected, onSelect, onDelete }: WordRowProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const ipa = item.pronunciation.includes('/') ? item.pronunciation : `/${item.pronunciation}/`;
  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={() => (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(item, () => swipeableRef.current?.close())}
          activeOpacity={0.7}
        >
          <Ionicons name="trash" size={24} color={Colors.white} />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      )}
      overshootLeft={false}
    >
      <TouchableOpacity
        style={[styles.card, isWide && styles.cardWide]}
        onPress={() => onSelect(isSelected ? null : item.word)}
        activeOpacity={1}
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
    </Swipeable>
  );
}

interface PendingDeletion {
  id: string;
  item: WordEntry;
}

export default function WordsScreen() {
  const { words, deleteWord } = useStore();
  const isWide = useIsWide();
  useBackToQuit();
  const numColumns = isWide ? 2 : 1;
  const sortedWords = [...words].sort((a, b) => b.lastLookedUp - a.lastLookedUp);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const [pendingDeletions, setPendingDeletions] = useState<PendingDeletion[]>([]);
  const deleteTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const pendingIds = new Set(pendingDeletions.map(d => d.id));
  const filteredWords = sortedWords.filter(w => !pendingIds.has(w.id));

  const searchedWords = searchQuery.trim()
    ? filteredWords.filter(
        (w) =>
          w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (w.pronunciation && w.pronunciation.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : filteredWords;

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const toggleSearch = () => {
    if (showSearch) setSearchQuery('');
    setShowSearch((v) => !v);
  };

  const handleDelete = (item: WordEntry, closeSwipeable: () => void) => {
    if (deleteTimeoutsRef.current[item.id]) return;
    setPendingDeletions(prev => [...prev, { id: item.id, item }]);
    setSelectedWord(null);
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
          <Ionicons name={showSearch ? 'close' : 'search'} size={22} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
      {searchedWords.length === 0 ? (
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
          data={searchedWords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WordRow
              item={item}
              isWide={isWide}
              searchQuery={searchQuery}
              isSelected={selectedWord === item.word}
              onSelect={setSelectedWord}
              onDelete={handleDelete}
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
  toastStack: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    gap: 8,
    zIndex: 1000,
  },
  deleteButton: {
    backgroundColor: Colors.dangerDark,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    marginBottom: 10,
    marginRight: -28,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    paddingRight: 28,
  },
  deleteButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
