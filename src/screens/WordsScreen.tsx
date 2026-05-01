import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Colors } from '../constants/theme';
import { getFlagForLanguage } from '../constants/languages';
import { WordEntry } from '../types';
import ScreenWrapper from '../components/ScreenWrapper';
import { useIsWide } from '../hooks/useLayout';

export default function WordsScreen() {
  const { words, deleteWord } = useStore();
  const isWide = useIsWide();
  const numColumns = isWide ? 2 : 1;
  const sortedWords = [...words].sort((a, b) => b.lastLookedUp - a.lastLookedUp);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDeleteWord = (word: WordEntry) => {
    Alert.alert(
      'Delete Word',
      `Are you sure you want to delete "${word.word}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteWord(word.id),
        },
      ]
    );
  };

  const renderWord = ({ item }: { item: WordEntry }) => (
    <TouchableOpacity
      style={[styles.card, isWide && styles.cardWide]}
      onLongPress={() => handleDeleteWord(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardRow}>
        <Text style={styles.flag}>{getFlagForLanguage(item.language)}</Text>
        <View style={styles.cardContent}>
          <Text style={styles.wordText}>{item.word}</Text>
          {item.pronunciation ? (
            <Text style={styles.pronunciation}>/{item.pronunciation}/</Text>
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
      <Text style={styles.title}>Saved Words</Text>
      {sortedWords.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="book-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No saved words yet.{'\n'}Tap words in Learn to look them up!</Text>
        </View>
      ) : (
        <FlatList
          key={numColumns}
          numColumns={numColumns}
          data={sortedWords}
          keyExtractor={(item) => item.id}
          renderItem={renderWord}
          columnWrapperStyle={isWide ? styles.row : undefined}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
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
  wordText: {
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
});
