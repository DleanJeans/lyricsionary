import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Colors } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';

export default function LearnScreen() {
  const navigation = useNavigation<any>();
  const { songs, currentSongId, fontSize, setFontSize, showTranslations, toggleTranslations, addOrUpdateWord, setWebUrl } = useStore();

  const song = songs.find((s) => s.id === currentSongId);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const lines = useMemo(() => {
    if (!song) return [];
    const originalLines = song.originalLyrics.split('\n');
    const translationLines = song.translations.map((t) => t.lyrics.split('\n'));
    return originalLines.map((line, i) => ({
      original: line,
      translations: translationLines.map((tl) => tl[i] || ''),
    }));
  }, [song]);

  const lineCount = lines.length;

  if (!song) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="musical-notes-outline" size={64} color={Colors.textMuted} />
        <Text style={styles.emptyText}>No lyrics to display.{'\n'}Go to Editor to add lyrics.</Text>
        <TouchableOpacity style={styles.goButton} onPress={() => navigation.navigate('Editor')}>
          <Text style={styles.goButtonText}>Go to Editor</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleWordPress = (word: string) => {
    const cleaned = word.replace(/[^\p{L}\p{N}'-]/gu, '');
    if (cleaned) {
      setSelectedWord(cleaned);
      addOrUpdateWord(cleaned, 'Original');
    }
  };

  const handleGoogleWord = () => {
    if (!selectedWord) return;
    setWebUrl(`https://www.google.com/search?q=define+${encodeURIComponent(selectedWord)}`);
    navigation.navigate('Web');
  };

  const handleWiktionaryWord = () => {
    if (!selectedWord) return;
    const url = `https://en.wiktionary.org/wiki/${encodeURIComponent(selectedWord)}`;
    setWebUrl(url);
    navigation.navigate('Web');
  };

  const renderPressableText = (text: string) => {
    const words = text.split(/(\s+)/);
    return (
      <Text style={{ fontSize, lineHeight: fontSize * 1.6, color: Colors.text }}>
        {words.map((word, i) =>
          word.trim() ? (
            <Text
              key={i}
              onPress={() => handleWordPress(word)}
              style={{
                color: selectedWord && word.replace(/[^\p{L}\p{N}'-]/gu, '') === selectedWord
                  ? Colors.primary
                  : Colors.text,
                fontWeight: selectedWord && word.replace(/[^\p{L}\p{N}'-]/gu, '') === selectedWord
                  ? '700'
                  : '400',
              }}
            >
              {word}
            </Text>
          ) : (
            <Text key={i}>{word}</Text>
          )
        )}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.songName} numberOfLines={1}>{song.songName}</Text>
          <Text style={styles.artistName}>{song.artistName}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={toggleTranslations}>
            <Ionicons
              name={showTranslations ? 'language' : 'eye-off-outline'}
              size={22}
              color={Colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('Editor', { songId: song.id })}
          >
            <Ionicons name="create-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Selected Word Panel */}
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

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.fontSizeControl}>
          <Ionicons name="text-outline" size={18} color={Colors.textSecondary} />
          <TouchableOpacity onPress={() => setFontSize(fontSize - 1)} style={styles.fontBtn}>
            <Ionicons name="remove" size={18} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.fontSizeText}>{fontSize}</Text>
          <TouchableOpacity onPress={() => setFontSize(fontSize + 1)} style={styles.fontBtn}>
            <Ionicons name="add" size={18} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.lineCounter}>{lineCount} lines</Text>
      </View>

      {/* Lyrics */}
      <ScrollView style={styles.lyricsScroll} contentContainerStyle={styles.lyricsContent}>
        {lines.map((line, i) => (
          <View key={i} style={styles.lineBlock}>
            {renderPressableText(line.original)}
            {showTranslations &&
              line.translations.map((tl, ti) =>
                tl ? (
                  <Text
                    key={ti}
                    style={[styles.translationLine, { fontSize: fontSize - 2 }]}
                  >
                    {tl}
                  </Text>
                ) : null
              )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  goButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 24,
  },
  goButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  songName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  artistName: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    padding: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
  },
  wordPanel: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
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
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fontSizeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fontBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 6,
  },
  fontSizeText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  lineCounter: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  lyricsScroll: {
    flex: 1,
  },
  lyricsContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  lineBlock: {
    marginBottom: 6,
  },
  translationLine: {
    color: Colors.primaryLight,
    fontStyle: 'italic',
    lineHeight: 22,
    marginTop: 2,
  },
});
