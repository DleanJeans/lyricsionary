import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Colors } from '../constants/theme';
import { getFlagForLanguage } from '../constants/languages';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Song, RootTabParamList } from '../types';
import ScreenWrapper from '../components/ScreenWrapper';
import { useIsWide } from '../hooks/useLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import { useBackToQuit } from '../hooks/useBackToQuit';
import { getFaviconUrl } from '../utils/getFaviconUrl';
import HighlightedText from '../components/HighlightedText';
import LanguageFilterModal from '../components/LanguageFilterModal';

export default function SongsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootTabParamList, 'Songs'>>();
  const { songs, setCurrentSongId, deleteSong, trackSongOpen, setMatchedSongs, setIsLoadingSong } = useStore();
  const isWide = useIsWide();
  useBackToQuit();
  const numColumns = isWide ? 2 : 1;
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInLyrics, setSearchInLyrics] = useState(false);
  const [sortMode, setSortMode] = useState<'lastOpened' | 'openCount' | 'aZ' | 'zA'>('lastOpened');
  const [showLanguageFilter, setShowLanguageFilter] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  // Handle search query from route params
  useEffect(() => {
    const paramSearchQuery = route.params?.searchQuery;
    if (paramSearchQuery) {
      setShowSearch(true);
      setSearchQuery(paramSearchQuery);
      // Clear the param after reading it
      navigation.setParams({ searchQuery: undefined });
    }
  }, [route.params?.searchQuery]);

  // Clear matched songs when component unmounts or search changes
  useEffect(() => {
    return () => {
      setMatchedSongs(null, 0);
    };
  }, []);

  // Get all unique languages from songs and count occurrences
  const { availableLanguages, languageCounts } = React.useMemo(() => {
    const counts: Record<string, number> = {};
    songs.forEach((song) => {
      (song.originalLanguages ?? []).forEach((lang) => {
        counts[lang] = (counts[lang] ?? 0) + 1;
      });
    });
    return {
      availableLanguages: Object.keys(counts).sort(),
      languageCounts: counts,
    };
  }, [songs]);

  const sortedSongs = [...songs].sort((a, b) => {
    switch (sortMode) {
      case 'lastOpened':
        return (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0);
      case 'openCount':
        return (b.openCount ?? 0) - (a.openCount ?? 0);
      case 'aZ':
        return a.songName.toLowerCase().localeCompare(b.songName.toLowerCase());
      case 'zA':
        return b.songName.toLowerCase().localeCompare(a.songName.toLowerCase());
      default:
        return 0;
    }
  });

  // Helper function to find matched line in lyrics
  const findMatchedLine = (song: Song, query: string): string | null => {
    if (!query.trim()) return null;
    const lines = song.originalLyrics.split('\n');
    const lowerQuery = query.toLowerCase();
    for (const line of lines) {
      if (line.toLowerCase().includes(lowerQuery)) {
        return line.trim();
      }
    }
    return null;
  };

  // Apply language filter
  const languageFilteredSongs =
    selectedLanguages.length > 0
      ? sortedSongs.filter((s) =>
          (s.originalLanguages ?? []).some((lang) => selectedLanguages.includes(lang))
        )
      : sortedSongs;

  // Apply search filter
  const filteredSongs = searchQuery.trim()
    ? languageFilteredSongs.filter((s) => {
        if (searchInLyrics) {
          // Search in lyrics
          return findMatchedLine(s, searchQuery) !== null;
        } else {
          // Search in song name and artist
          return (
            s.songName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.artistName.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
      })
    : languageFilteredSongs;

  const handlePressSong = (song: Song) => {
    setIsLoadingSong(true);
    // Navigate immediately so LearnScreen can show loading overlay
    navigation.navigate('Editor', { songId: song.id });
    navigation.navigate('Learn');
    // Defer expensive operations to next tick to avoid blocking navigation
    setTimeout(() => {
      setCurrentSongId(song.id);
      trackSongOpen(song.id);
    }, 0);
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
    if (showSearch) {
      setSearchQuery('');
      setSearchInLyrics(false);
    }
    setShowSearch((v) => !v);
  };

  const cycleSortMode = () => {
    setSortMode((current) => {
      switch (current) {
        case 'lastOpened':
          return 'openCount';
        case 'openCount':
          return 'aZ';
        case 'aZ':
          return 'zA';
        case 'zA':
          return 'lastOpened';
        default:
          return 'lastOpened';
      }
    });
  };

  const getSortIcon = () => {
    switch (sortMode) {
      case 'lastOpened':
        return 'time-outline';
      case 'openCount':
        return 'stats-chart-outline';
      case 'aZ':
        return 'arrow-down';
      case 'zA':
        return 'arrow-up';
      default:
        return 'time-outline';
    }
  };

  const renderSong = ({ item }: { item: Song }) => {
    const matchedLine = searchInLyrics && searchQuery.trim() ? findMatchedLine(item, searchQuery) : null;

    return (
      <TouchableOpacity
        style={[styles.card, isWide && styles.cardWide]}
        onPress={() => handlePressSong(item)}
        onLongPress={() => handleDeleteSong(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View style={styles.songNameRow}>
            <HighlightedText
              text={item.songName}
              query={searchInLyrics ? '' : searchQuery}
              style={styles.songName}
              numberOfLines={1}
            />
          </View>
          <HighlightedText
            text={item.artistName || 'Unknown Artist'}
            query={searchInLyrics ? '' : searchQuery}
            style={styles.artistName}
            numberOfLines={1}
          />
          <View style={styles.meta}>
            {getFaviconUrl(item.sourceUrl ?? '') && (
              <Image source={{ uri: getFaviconUrl(item.sourceUrl ?? '')! }} style={styles.sourceFavicon} />
            )}
            <Text style={styles.metaText}>{getWordCount(item)} words</Text>
            <View style={styles.languages}>
              {(item.originalLanguages ?? []).map((lang) => (
                <Text key={`orig-${lang}`} style={styles.flag}>
                  {getFlagForLanguage(lang)}
                </Text>
              ))}
              {item.translations.length > 0 && (
                <Text style={styles.flagArrow}>→</Text>
              )}
              {item.translations.map((t) => (
                <Text key={t.language} style={styles.flag}>
                  {getFlagForLanguage(t.language)}
                </Text>
              ))}
            </View>
          </View>
          {matchedLine && (
            <View style={styles.matchedLineContainer}>
              <HighlightedText
                text={matchedLine}
                query={searchQuery}
                style={styles.matchedLine}
                numberOfLines={1}
              />
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper>
      <View style={[styles.titleRow, showSearch ? { marginBottom: 12 } : { marginTop: 6.5, marginBottom: 25 - 6.5 }]}>
        <TouchableOpacity
          onPress={cycleSortMode}
          style={styles.searchButton}
        >
          <Ionicons
            name={getSortIcon()}
            size={22}
            color={Colors.textMuted}
          />
        </TouchableOpacity>
        {showSearch ? (
          <>
            <TextInput
              style={styles.searchInput}
              placeholder={searchInLyrics ? 'Search lyrics' : 'Search title or artist'}
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <View style={styles.searchButtons}>
              <TouchableOpacity
                onPress={() => setSearchInLyrics(!searchInLyrics)}
                style={styles.lyricsToggle}
              >
                <Ionicons
                  name={searchInLyrics ? 'musical-notes' : 'musical-notes-outline'}
                  size={22}
                  color={searchInLyrics ? Colors.primary : Colors.textMuted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleSearch}
              >
                <Ionicons
                  name={'close'}
                  size={22}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Text style={styles.title}>Saved Songs</Text>
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {!showSearch && (
            <TouchableOpacity
              onPress={toggleSearch}
              style={styles.searchButton}
            >
              <Ionicons
                name={'search'}
                size={22}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setShowLanguageFilter(true)}
            style={styles.searchButton}
          >
            <Ionicons
              name="funnel-outline"
              size={22}
              color={selectedLanguages.length > 0 ? Colors.primary : Colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {filteredSongs.length === 0 ? (
        <View style={styles.empty}>
          {songs.length === 0 ? (
            <>
              <Ionicons
                name="library-outline"
                size={64}
                color={Colors.textMuted}
              />
              <Text style={styles.emptyText}>
                No saved songs yet.{'\n'}Go to Editor to add some!
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="search-outline"
                size={64}
                color={Colors.textMuted}
              />
              <Text style={styles.emptyText}>
                {selectedLanguages.length > 0 || searchQuery.trim()
                  ? 'No songs match your filters.'
                  : 'No songs match your search.'}
              </Text>
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
      <LanguageFilterModal
        visible={showLanguageFilter}
        onClose={() => setShowLanguageFilter(false)}
        selectedLanguages={selectedLanguages}
        onLanguagesChange={setSelectedLanguages}
        availableLanguages={availableLanguages}
        languageCounts={languageCounts}
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
    justifyContent: 'space-between',
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
  searchButton: {
    padding: 4,
    zIndex: 1,
  },
  searchButtons: {
    flexDirection: 'row',
    gap: 8,
    marginRight: 16,
    marginLeft: -60,
  },
  lyricsToggle: {
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
    marginLeft: 8,
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
  songNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  songName: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  sourceFavicon: {
    width: 14,
    height: 14,
    borderRadius: 2,
    marginTop: 2,
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
    gap: 6,
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
  flagArrow: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  matchedLineContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  matchedLine: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
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
