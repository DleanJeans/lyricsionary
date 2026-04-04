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
import { useNavigation } from '@react-navigation/native';
import { Song } from '../types';
import ScreenWrapper from '../components/ScreenWrapper';
import { useIsWide } from '../hooks/useLayout';

export default function LyricsScreen() {
  const navigation = useNavigation<any>();
  const { songs, setCurrentSongId } = useStore();
  const isWide = useIsWide();
  const numColumns = isWide ? 2 : 1;

  const handlePressSong = (song: Song) => {
    setCurrentSongId(song.id);
    navigation.navigate('Learn');
  };

  const getWordCount = (song: Song) => {
    const words = song.originalLyrics.split(/\s+/).filter(Boolean);
    return words.length;
  };

  const renderSong = ({ item }: { item: Song }) => (
    <TouchableOpacity
      style={[styles.card, isWide && styles.cardWide]}
      onPress={() => handlePressSong(item)}
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
      <Text style={styles.title}>Saved Lyrics</Text>
      {songs.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="library-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No saved lyrics yet.{'\n'}Go to Editor to add some!</Text>
        </View>
      ) : (
        <FlatList
          key={numColumns}
          numColumns={numColumns}
          data={songs}
          keyExtractor={(item) => item.id}
          renderItem={renderSong}
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
