import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Text, TextInput } from '../components/Text';
import { Ionicons } from '@expo/vector-icons';
import { isWordIgnored, useStore } from '../store/useStore';
import { Colors } from '../constants/theme';
import { getFlagForLanguage, getLanguageNameFromCode } from '../constants/languages';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Song, RootTabParamList } from '../types';
import ScreenWrapper from '../components/ScreenWrapper';
import { useIsWide } from '../hooks/useLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import IconButton from '../components/IconButton';
import { useBackToQuit } from '../hooks/useBackToQuit';
import { getFaviconUrl } from '../utils/getFaviconUrl';
import HighlightedText from '../components/HighlightedText';
import LanguageTabButtons from '../components/LanguageTabButtons';
import { countKnownWords } from '../utils/wordFrequency';
import { matchesSearch } from '../utils/search';
import { buildKnownGermanWords, getCompoundParts, isGermanLanguage } from '../utils/compoundWords';

export default function SongsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootTabParamList, 'Songs'>>();
  const songs = useStore((s) => s.songs);
  const setCurrentSongId = useStore((s) => s.setCurrentSongId);
  const deleteSong = useStore((s) => s.deleteSong);
  const trackSongOpen = useStore((s) => s.trackSongOpen);
  const setMatchedSongs = useStore((s) => s.setMatchedSongs);
  const setIsLoadingSong = useStore((s) => s.setIsLoadingSong);
  const isLoadingSong = useStore((s) => s.isLoadingSong);
  const words = useStore((s) => s.words);
  const ignoredWords = useStore((s) => s.ignoredWords);
  const compoundSplits = useStore((s) => s.compoundSplits);
  const isWide = useIsWide();
  useBackToQuit();
  const numColumns = isWide ? 2 : 1;
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInLyrics, setSearchInLyrics] = useState(false);
  const [sortMode, setSortMode] = useState<'lastOpened' | 'openCount' | 'aZ' | 'zA'>('lastOpened');
  const [showLanguageTabs, setShowLanguageTabs] = useState(true);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isLoadingSong) {
      setLoadingSongId(null);
    }
  }, [isLoadingSong]);

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
    const lyricSources = [song.originalLyrics, ...song.translations.map((translation) => translation.lyrics)];
    for (const lyrics of lyricSources) {
      for (const line of lyrics.split('\n')) {
        if (matchesSearch(line, query)) {
          return line.trim();
        }
      }
    }
    return null;
  };

  // Apply language filter
  const languageFilteredSongs =
    selectedLanguages.length > 0
      ? sortedSongs.filter((s) => (s.originalLanguages ?? []).some((lang) => selectedLanguages.includes(lang)))
      : sortedSongs;

  // Apply search filter
  const filteredSongs = searchQuery.trim()
    ? languageFilteredSongs.filter((s) => {
        if (searchInLyrics) {
          // Search in lyrics
          return findMatchedLine(s, searchQuery) !== null;
        } else {
          // Search in song name and artist

          return matchesSearch(s.songName, searchQuery) || matchesSearch(s.artistName, searchQuery);
        }
      })
    : languageFilteredSongs;

  const handlePressSong = (song: Song) => {
    setIsLoadingSong(true);
    setLoadingSongId(song.id);
    // Defer expensive operations to next tick to avoid blocking navigation
    setTimeout(() => {
      setCurrentSongId(song.id);
      void trackSongOpen(song.id);
      navigation.navigate('Editor', { songId: song.id });
      navigation.navigate('Learn', { songId: song.id });
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

  // Saved words keyed by "language\u0000word", with language names normalized like LearnScreen
  const savedWordKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const entry of words) {
      const language = (getLanguageNameFromCode(entry.language) ?? entry.language).toLowerCase();
      keys.add(`${language}\u0000${entry.word.toLowerCase()}`);
    }
    return keys;
  }, [words]);

  // Whether a German compound splits into saved words, like Learn shows it, e.g. Liebesbrief once
  // Liebe and Brief are saved; cached per word since every song's lyrics are checked on each render
  const isKnownCompound = useMemo(() => {
    const knownGermanWords = buildKnownGermanWords(words);
    const cache = new Map<string, boolean>();
    return (word: string) => {
      const lower = word.toLowerCase();
      let known = cache.get(lower);
      if (known === undefined) {
        const parts = getCompoundParts(word, compoundSplits, knownGermanWords);
        known = !!parts && parts.every((part) => knownGermanWords.has(part.lemma));
        cache.set(lower, known);
      }
      return known;
    };
  }, [words, compoundSplits]);

  const formatWordProgress = (song: Song) => {
    const total = getWordCount(song);
    const known = getKnownWordCount(song);
    const percent = total > 0 ? Math.floor((known / total) * 100) : 0;
    return `${known}/${total} words (${percent}%)`;
  };

  const getKnownWordCount = (song: Song) => {
    const languages = (song.originalLanguages ?? []).map((l) => (getLanguageNameFromCode(l) ?? l).toLowerCase());
    const ignoreLanguage = song.originalLanguages?.[0] || 'unknown';
    const isGermanSong = isGermanLanguage(song.originalLanguages);
    return countKnownWords(song.originalLyrics, (word) => {
      const lower = word.toLowerCase();
      return (
        languages.some((language) => savedWordKeys.has(`${language}\u0000${lower}`)) ||
        isWordIgnored(ignoredWords, word, ignoreLanguage) ||
        (isGermanSong && isKnownCompound(word))
      );
    }, song.originalLanguages);
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

  const getSortLabel = () => {
    switch (sortMode) {
      case 'lastOpened':
        return 'recently opened';
      case 'openCount':
        return 'most opened';
      case 'aZ':
        return 'title A to Z';
      case 'zA':
        return 'title Z to A';
      default:
        return 'recently opened';
    }
  };

  const renderSong = ({ item }: { item: Song }) => {
    const matchedLine = searchInLyrics && searchQuery.trim() ? findMatchedLine(item, searchQuery) : null;
    const isLoadingThisSong = loadingSongId === item.id;
    const isAnySongLoading = loadingSongId !== null;

    return (
      <TouchableOpacity
        style={[styles.card, isWide && styles.cardWide]}
        onPress={() => handlePressSong(item)}
        onLongPress={() => handleDeleteSong(item)}
        activeOpacity={0.7}
        disabled={isAnySongLoading}
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
            <Text style={styles.metaText}>{formatWordProgress(item)}</Text>
            <View style={styles.languages}>
              {(item.originalLanguages ?? []).map((lang) => (
                <Text key={`orig-${lang}`} style={styles.flag}>
                  {getFlagForLanguage(lang)}
                </Text>
              ))}
              {item.translations.length > 0 && <Text style={styles.flagArrow}>→</Text>}
              {item.translations.map((t) => (
                <Text key={t.language} style={styles.flag}>
                  {getFlagForLanguage(t.language)}
                </Text>
              ))}
            </View>
          </View>
          {matchedLine && (
            <View style={styles.matchedLineContainer}>
              <HighlightedText text={matchedLine} query={searchQuery} style={styles.matchedLine} numberOfLines={1} />
            </View>
          )}
        </View>
        {isLoadingThisSong ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        )}
      </TouchableOpacity>
    );
  };

  const sortLabel = getSortLabel();
  const sortChip = (
    <TouchableOpacity
      style={styles.sortChip}
      onPress={cycleSortMode}
      accessibilityRole="button"
      accessibilityLabel={'Sort songs by ' + sortLabel}
    >
      <Ionicons name={getSortIcon()} size={16} color={Colors.textSecondary} />
      <Text style={styles.sortChipLabel}>{sortLabel.charAt(0).toUpperCase() + sortLabel.slice(1)}</Text>
    </TouchableOpacity>
  );

  const searchInput = (
    <TextInput
      style={styles.searchInput}
      placeholder={searchInLyrics ? 'Search lyrics' : 'Search title or artist'}
      placeholderTextColor={Colors.textMuted}
      value={searchQuery}
      onChangeText={setSearchQuery}
      autoFocus={showSearch}
    />
  );

  const lyricsSearchToggle = (
    <IconButton
      icon={searchInLyrics ? 'musical-notes' : 'musical-notes-outline'}
      label={searchInLyrics ? 'Searching in lyrics' : 'Search in lyrics'}
      onPress={() => setSearchInLyrics(!searchInLyrics)}
      selected={searchInLyrics}
    />
  );

  const closeSearchButton = (
    <IconButton icon="close" label="Close song search" onPress={toggleSearch} />
  );

  const searchToggleButton = (
    <IconButton icon="search" label="Open song search" onPress={toggleSearch} />
  );

  const languageTabsToggle = (
    <IconButton
      icon="language-outline"
      label={showLanguageTabs ? 'Hide language filters' : 'Show language filters'}
      onPress={() => setShowLanguageTabs(!showLanguageTabs)}
      selected={selectedLanguages.length > 0}
    />
  );

  return (
    <ScreenWrapper>
      <View style={styles.titleRow}>
        {languageTabsToggle}
        {showSearch ? (
          <>
            {searchInput}
            {closeSearchButton}
            {lyricsSearchToggle}
          </>
        ) : (
          <>
            <Text style={styles.title} numberOfLines={1}>Saved Songs</Text>
            {searchToggleButton}
          </>
        )}
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

      <View style={styles.sortRow}>{sortChip}</View>

      {filteredSongs.length === 0 ? (
        songs.length === 0 ? (
          <EmptyState
            icon="library-outline"
            title="Your library is empty"
            message="Add a song to start practicing lyrics and looking up words."
            actionLabel="Create New Lyrics"
            onAction={() => navigation.navigate('Editor')}
          />
        ) : (
          <EmptyState
            icon="search-outline"
            title="No songs found"
            message="Try a different search or clear the active filters."
            actionLabel="Clear filters"
            onAction={() => {
              setSearchQuery('');
              setSearchInLyrics(false);
              setSelectedLanguages([]);
            }}
          />
        )
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
    gap: 8,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
  },
  sortRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sortChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
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
  languageTabsContainer: {
    marginBottom: 12,
  },
});
