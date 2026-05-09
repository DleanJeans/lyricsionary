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
import { useNavigation } from '@react-navigation/native';
import { Song } from '../types';
import ScreenWrapper from '../components/ScreenWrapper';
import { useIsWide } from '../hooks/useLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import { useBackToQuit } from '../hooks/useBackToQuit';

export default function LyricsScreen() {
  const navigation = useNavigation<any>();
  const { songs, setCurrentSongId, deleteSong } = useStore();
  const isWide = useIsWide();
  useBackToQuit();
  const numColumns = isWide ? 2 : 1;
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSongs = searchQuery.trim()
    ? songs.filter(
        (s) =>
          s.songName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.artistName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : songs;

  const handlePressSong = (song: Song) => {
    setCurrentSongId(song.id);
    navigation.navigate('Learn');
  };

  const handleDeleteSong = (song: Song) => {
    setSongToDelete(song);
  };

  const confirmDelete = () => {
    if (songToDelete) {
      deleteSong(songToDelete.id);
      setSongToDelete(null);
    }
  };

  const cancelDelete = () => {
    setSongToDelete(null);
  };

  const getWordCount = (song: Song) => {
    const words = song.originalLyrics.split(/\s+/).filter(Boolean);
    return words.length;
  };

  const toggleSearch = () => {
    if (showSearch) setSearchQuery('');
    setShowSearch((v) => !v);
  };

  const renderSong = ({ item }: { item: Song }) => (
    <TouchableOpacity
      style={[styles.card, isWide && styles.cardWide]}
      onPress={() => handlePressSong(item)}
      onLongPress={() => handleDeleteSong(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.songName} numberOfLines={1}>{item.songName}</Text>
        <Text style={styles.artistName} numberOfLines={1}>{item.artistName || 'Unknown Artist'}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{getWordCount(item)} words</Text>
          <View style={styles.languages}>
            {item.translations.map((t) => (
              <Text key={t.language} style={styles.flag}>
                {getFlagForLanguage(t.language)}
              </Text>
            ))}
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Saved Songs</Text>
        <TouchableOpacity onPress={toggleSearch} style={styles.searchButton}>
          <Ionicons
            name={showSearch ? 'close' : 'search'}
            size={22}
            color={Colors.textMuted}
          />
        </TouchableOpacity>
      </View>
      {showSearch && (
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title or artist..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
      )}
      {filteredSongs.length === 0 ? (
        <View style={styles.empty}>
          {songs.length === 0 ? (
            <>
              <Ionicons name="library-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No saved songs yet.{'\n'}Go to Editor to add some!</Text>
            </>
          ) : (
            <>
              <Ionicons name="search-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No songs match your search.</Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          key={numColumns}
          numColumns={numColumns}
          data={filteredSongs}
          keyExtractor={(item) => item.id}
          renderItem={renderSong}
          columnWrapperStyle={isWide ? styles.row : undefined}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
      <ConfirmDialog
        visible={songToDelete !== null}
        title={`Delete Song: ${songToDelete?.songName}`}
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
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
    flexDirection: 'row',
    alignItems: 'center',
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
  cardLeft: {
    flex: 1,
  },
  songName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  artistName: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  languages: {
    flexDirection: 'row',
    gap: 4,
  },
  flag: {
    fontSize: 16,
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
