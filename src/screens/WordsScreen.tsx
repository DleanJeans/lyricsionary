import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Colors } from '../constants/theme';
import { getFlagForLanguage } from '../constants/languages';
import { WordEntry } from '../types';

export default function WordsScreen() {
  const { words, setWebUrl, setCurrentSongId } = useStore();
  const sortedWords = [...words].sort((a, b) => b.lastLookedUp - a.lastLookedUp);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderWord = ({ item }: { item: WordEntry }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.7}>
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
    <View style={styles.container}>
      <Text style={styles.title}>Saved Words</Text>
      {sortedWords.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="book-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No saved words yet.{'\n'}Tap words in Learn to look them up!</Text>
        </View>
      ) : (
        <FlatList
          data={sortedWords}
          keyExtractor={(item) => item.id}
          renderItem={renderWord}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  list: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
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
