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
import { useStore } from '../store/useStore';
import { phraseStartsOf } from '../utils/cjkWords';
import { Colors } from '../constants/theme';
import { getFlagForLanguage } from '../constants/languages';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MasteryLevel, Song, RootTabParamList, WordEntry } from '../types';
import ScreenWrapper from '../components/ScreenWrapper';
import { useIsWide } from '../hooks/useLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import IconButton from '../components/IconButton';
import { useBackToQuit } from '../hooks/useBackToQuit';
import { getFaviconUrl } from '../utils/getFaviconUrl';
import HighlightedText from '../components/HighlightedText';
import LanguageTabButtons from '../components/LanguageTabButtons';
import { matchesSearch } from '../utils/search';
import { usePersistedState } from '../hooks/usePersistedState';
import { useWordProgress } from '../hooks/useWordProgress';
import SongLevelBar from '../components/SongLevelBar';
import ProgressRing from '../components/ProgressRing';
import SpotifyNowPlaying from '../components/SpotifyNowPlaying';
import SpotifyPlaylists from '../components/SpotifyPlaylists';
import ReviewSession from '../components/ReviewSession';
import { buildReviewItems, canReview, dueWords, type ReviewItem } from '../utils/reviewQuiz';
import { countKnownWords } from '../utils/wordFrequency';
import { canFillGaps, countGaps, gapWord, songWordIndex } from '../utils/lyricGaps';

const NO_SONGS: Song[] = [];
const SORT_MODES = ['lastOpened', 'openCount', 'progress', 'nextToLearn', 'aZ', 'zA'] as const;
type SortMode = (typeof SORT_MODES)[number];
const newWordsLabel = (count: number) => (count === 0 ? 'Every word known' : `${count} new ${count === 1 ? 'word' : 'words'} to go`);
const isSortMode = (value: unknown): value is SortMode => SORT_MODES.includes(value as SortMode);

export default function SongsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootTabParamList, 'Songs'>>();
  const songs = useStore((s) => s.songs);
  const setCurrentSongId = useStore((s) => s.setCurrentSongId);
  const deleteSong = useStore((s) => s.deleteSong);
  const updateSong = useStore((s) => s.updateSong);
  const [showArchived, setShowArchived] = useState(false);
  const spotifyConnected = useStore((s) => s.spotifyConnected);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const trackSongOpen = useStore((s) => s.trackSongOpen);
  const setMatchedSongs = useStore((s) => s.setMatchedSongs);
  const setIsLoadingSong = useStore((s) => s.setIsLoadingSong);
  const isLoadingSong = useStore((s) => s.isLoadingSong);
  const isWide = useIsWide();
  useBackToQuit();
  const numColumns = isWide ? 2 : 1;
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInLyrics, setSearchInLyrics] = useState(false);
  const [sortMode, setSortMode] = usePersistedState('@lyricsionary_songs_sort', 'lastOpened', isSortMode);
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

  // Get all unique languages from the songs listed (archived ones or the rest) and count occurrences
  const { availableLanguages, languageCounts } = React.useMemo(() => {
    const counts: Record<string, number> = {};
    const archivedShown = showArchived && songs.some((song) => song.archivedAt);
    songs.filter((song) => !!song.archivedAt === archivedShown).forEach((song) => {
      (song.originalLanguages ?? []).forEach((lang) => {
        counts[lang] = (counts[lang] ?? 0) + 1;
      });
    });
    return {
      availableLanguages: Object.keys(counts).sort(),
      languageCounts: counts,
    };
  }, [songs, showArchived]);

  // Helper function to find matched line in lyrics
  // The first line with the search, and the song's own line there, as a translation's lines follow the song's
  const findMatch = (song: Song, query: string): { line: string; original: string } | null => {
    if (!query.trim()) return null;
    const originalLines = song.originalLyrics.split('\n');
    const lyricSources = [song.originalLyrics, ...song.translations.map((translation) => translation.lyrics)];
    for (const lyrics of lyricSources) {
      const lines = lyrics.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (matchesSearch(lines[i], query)) return { line: lines[i].trim(), original: originalLines[i] ?? '' };
      }
    }
    return null;
  };
  const findMatchedLine = (song: Song, query: string): string | null => findMatch(song, query)?.line ?? null;

  // fillIn opens the song with its saved words to recall as gaps
  const handlePressSong = (song: Song, fillIn = false) => {
    setIsLoadingSong(true);
    setLoadingSongId(song.id);
    // Defer expensive operations to next tick to avoid blocking navigation
    setTimeout(() => {
      setCurrentSongId(song.id);
      void trackSongOpen(song.id);
      navigation.navigate('Editor', { songId: song.id });
      // Found by searching the lyrics: opens at the line
      const match = searchInLyrics && !fillIn ? findMatch(song, searchQuery) : null;
      const focus = match?.original.trim() ? { line: match.original } : undefined;
      navigation.navigate('Learn', { songId: song.id, fillIn, focus });
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

  // Archived songs leave the list but keep their words and progress
  const toggleArchived = () => {
    if (songToDelete) {
      void updateSong(songToDelete.id, { archivedAt: songToDelete.archivedAt ? undefined : Date.now() });
      setSongToDelete(null);
    }
  };

  const cancelDelete = () => {
    setSongToDelete(null);
  };

  // Each song's progress, saved words, gaps and due words are counted from every song's lyrics, which
  // takes a moment with many songs, so the list shows first and they fill in right after. Sorting by
  // progress waits for them, so the list doesn't jump.
  const [showStats, setShowStats] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowStats(true), 0);
    return () => clearTimeout(timer);
  }, []);
  const needsStats = sortMode === 'progress' || sortMode === 'nextToLearn';
  const statsSongs = showStats || needsStats ? songs : NO_SONGS;
  const wordProgress = useWordProgress(statsSongs);
  const words = useStore((s) => s.words);
  // The saved words index for a song's languages, built once per set of languages instead of per song
  const wordIndexFor = useMemo(() => {
    const indexes = new Map<string, Map<string, WordEntry>>();
    const starts = new Map<Map<string, WordEntry>, Set<string>>();
    return Object.assign(
      (languages: string[] | undefined) => {
        const key = (languages ?? []).join('\u0000');
        let index = indexes.get(key);
        if (!index) indexes.set(key, (index = songWordIndex(words, languages)));
        return index;
      },
      {
        // The first words of the index's phrases, to look for phrases only from them
        phraseStarts: (index: Map<string, WordEntry>) => {
          let set = starts.get(index);
          if (!set) starts.set(index, (set = phraseStartsOf(index.keys())));
          return set;
        },
      }
    );
  }, [words]);
  // Saved words each song has to fill in, the same gaps Learn blanks out
  const songGapsCache = useMemo(() => new WeakMap<Song, number>(), [wordIndexFor]);
  const songGaps = useMemo(() => {
    const now = Date.now();
    const gaps = new Map<string, number>();
    for (const song of statsSongs) {
      let count = songGapsCache.get(song);
      if (count === undefined) {
        const index = wordIndexFor(song.originalLanguages);
        count = canFillGaps(index) ? countGaps(song.originalLyrics, (word) => gapWord(index, word, now)) : 0;
        songGapsCache.set(song, count);
      }
      if (count) gaps.set(song.id, count);
    }
    return gaps;
  }, [statsSongs, wordIndexFor, songGapsCache]);

  // Each song's saved words: the ones in its lyrics and the ones saved from it. Kept per song until the
  // saved words change, so opening a song, which updates just its open count, doesn't read every song again.
  const songWordsCache = useMemo(() => new WeakMap<Song, WordEntry[]>(), [wordIndexFor]);
  const songWords = useMemo(() => {
    const bySong = new Map<string, WordEntry[]>();
    for (const song of statsSongs) {
      const cached = songWordsCache.get(song);
      if (cached) {
        bySong.set(song.id, cached);
        continue;
      }
      const index = wordIndexFor(song.originalLanguages);
      const entries = new Set<WordEntry>();
      // Read like the song's word count, so phrases, Chinese words and Korean stems are found too
      countKnownWords(song.originalLyrics, (word) => {
        const entry = index.get(word.toLowerCase());
        if (entry) entries.add(entry);
        return !!entry;
      }, song.originalLanguages, undefined, wordIndexFor.phraseStarts(index));
      for (const word of words) if (word.contexts?.some((c) => c.songId === song.id)) entries.add(word);
      songWordsCache.set(song, [...entries]);
      bySong.set(song.id, songWordsCache.get(song)!);
    }
    return bySong;
  }, [statsSongs, words, wordIndexFor, songWordsCache]);

  // Each song's saved words by level
  const songLevels = useMemo(() => {
    const levels = new Map<string, Partial<Record<MasteryLevel, number>>>();
    for (const [songId, entries] of songWords) {
      const counts: Partial<Record<MasteryLevel, number>> = {};
      for (const entry of entries) {
        const level = entry.masteryLevel ?? 'Seen';
        counts[level] = (counts[level] ?? 0) + 1;
      }
      levels.set(songId, counts);
    }
    return levels;
  }, [songWords]);

  // Each song's words a quiz now would move toward their next level, to review from its card. Their
  // quizzes are built when Review is tapped: building them all here took seconds with many saved words.
  const songDue = useMemo(() => {
    const now = Date.now();
    return new Map([...songWords].map(([songId, entries]) => [songId, dueWords(entries, now).filter(canReview)]));
  }, [songWords]);
  const [reviewing, setReviewing] = useState<ReviewItem[] | null>(null);

  const archivedCount = songs.filter((s) => s.archivedAt).length;
  const listed = archivedCount && showArchived ? songs.filter((s) => s.archivedAt) : songs.filter((s) => !s.archivedAt);
  const sortedSongs = [...listed].sort((a, b) => {
    switch (sortMode) {
      case 'lastOpened':
        return (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0);
      case 'openCount':
        return (b.openCount ?? 0) - (a.openCount ?? 0);
      case 'progress':
        return (wordProgress.get(b.id)?.percent ?? 0) - (wordProgress.get(a.id)?.percent ?? 0);
      case 'nextToLearn': {
        // The song with the fewest new words is the quickest to finish; finished songs go last
        const left = (song: Song) => wordProgress.get(song.id)?.newWords || Infinity;
        return left(a) - left(b) || (wordProgress.get(b.id)?.percent ?? 0) - (wordProgress.get(a.id)?.percent ?? 0);
      }
      case 'aZ':
        return a.songName.toLowerCase().localeCompare(b.songName.toLowerCase());
      case 'zA':
        return b.songName.toLowerCase().localeCompare(a.songName.toLowerCase());
      default:
        return 0;
    }
  });

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

  const toggleSearch = () => {
    if (showSearch) {
      setSearchQuery('');
      setSearchInLyrics(false);
    }
    setShowSearch((v) => !v);
  };

  const cycleSortMode = () => {
    setSortMode(SORT_MODES[(SORT_MODES.indexOf(sortMode) + 1) % SORT_MODES.length]);
  };

  const getSortIcon = () => {
    switch (sortMode) {
      case 'lastOpened':
        return 'time-outline';
      case 'openCount':
        return 'stats-chart-outline';
      case 'progress':
        return 'trending-up-outline';
      case 'nextToLearn':
        return 'flag-outline';
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
      case 'progress':
        return 'most words known';
      case 'nextToLearn':
        return 'fewest new words';
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
        <View style={styles.cardTop}>
          {isLoadingThisSong ? (
            <View style={styles.ringSlot}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : wordProgress.get(item.id) && wordProgress.get(item.id)!.total > 0 ? (
            <ProgressRing percent={wordProgress.get(item.id)!.percent} />
          ) : statsSongs === NO_SONGS ? (
            // Keeps the ring's place while the progress is counted
            <View style={styles.ringSlot} />
          ) : null}
          <View style={styles.cardInfo}>
            <View style={styles.songNameRow}>
              <HighlightedText
                text={item.songName}
                query={searchInLyrics ? '' : searchQuery}
                style={styles.songName}
                numberOfLines={1}
              />
              {(() => {
                // Every word saved (or ignored): complete; and every saved word at Known: mastered
                const progress = wordProgress.get(item.id);
                if (!progress || progress.total === 0 || progress.newWords > 0) return null;
                const levels = songLevels.get(item.id) ?? {};
                const mastered = Object.entries(levels).every(([level, count]) => level === 'Known' || !count);
                return (
                  <View style={[styles.completeBadge, mastered && styles.masteredBadge]} accessibilityLabel={mastered ? 'Mastered' : 'Complete'}>
                    <Ionicons name={mastered ? 'trophy' : 'checkmark-circle'} size={12} color={mastered ? Colors.warning : Colors.success} />
                    <Text style={[styles.completeText, mastered && styles.masteredText]}>{mastered ? 'Mastered' : 'Complete'}</Text>
                  </View>
                );
              })()}
            </View>
            <View style={styles.artistRow}>
              <HighlightedText
                text={item.artistName || 'Unknown Artist'}
                query={searchInLyrics ? '' : searchQuery}
                style={styles.artistName}
                numberOfLines={1}
              />
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
            <View style={styles.meta}>
              {getFaviconUrl(item.sourceUrl ?? '') && (
                <Image source={{ uri: getFaviconUrl(item.sourceUrl ?? '')! }} style={styles.sourceFavicon} />
              )}
              <Text style={styles.metaText} numberOfLines={1}>
                {(() => {
                  const progress = wordProgress.get(item.id);
                  const levels = songLevels.get(item.id);
                  const saved = levels ? Object.values(levels).reduce((sum, n) => sum + (n ?? 0), 0) : 0;
                  const recalled = levels ? (levels.Recalled ?? 0) + (levels.Known ?? 0) : 0;
                  const words = !progress
                    ? ''
                    : sortMode === 'nextToLearn'
                      ? newWordsLabel(progress.newWords)
                      : `${progress.known}/${progress.total} words`;
                  return [words, saved > 0 ? `${recalled}/${saved} recalled` : ''].filter(Boolean).join(' · ');
                })()}
              </Text>
            </View>
          </View>
        </View>
        {songLevels.get(item.id) && <SongLevelBar counts={songLevels.get(item.id)!} full />}
        {matchedLine && (
          <View style={styles.matchedLineContainer}>
            <HighlightedText text={matchedLine} query={searchQuery} style={styles.matchedLine} numberOfLines={1} />
          </View>
        )}
        {(!!songDue.get(item.id)?.length || !!songGaps.get(item.id)) && (
          <View style={styles.actions}>
            {!!songDue.get(item.id)?.length && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  const items = buildReviewItems(songDue.get(item.id)!, useStore.getState().words);
                  if (items.length) setReviewing(items);
                }}
                disabled={isAnySongLoading}
                accessibilityRole="button"
                accessibilityLabel={`Review ${songDue.get(item.id)!.length} due words from this song`}
              >
                <Ionicons name="flash-outline" size={16} color={Colors.primary} />
                <Text style={styles.actionText}>Review {songDue.get(item.id)!.length}</Text>
              </TouchableOpacity>
            )}
            {!!songGaps.get(item.id) && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handlePressSong(item, true)}
                disabled={isAnySongLoading}
                accessibilityRole="button"
                accessibilityLabel={`Fill in the lyrics, ${songGaps.get(item.id)} words`}
              >
                <Ionicons name="create-outline" size={16} color={Colors.primary} />
                <Text style={styles.actionText}>Fill in {songGaps.get(item.id)}</Text>
              </TouchableOpacity>
            )}
          </View>
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

      <SpotifyNowPlaying
        onOpen={(song) => handlePressSong(song)}
        onFetch={(songName, artistName) => navigation.navigate('Editor', { autoFetchSong: { songName, artistName } })}
      />

      <View style={styles.sortRow}>
        {sortChip}
        {spotifyConnected && (
          <TouchableOpacity
            style={styles.sortChip}
            onPress={() => setShowPlaylists(true)}
            accessibilityRole="button"
            accessibilityLabel="Your Spotify playlists"
          >
            <Ionicons name="list" size={16} color="#1DB954" />
            <Text style={styles.sortChipLabel}>Playlists</Text>
          </TouchableOpacity>
        )}
        {archivedCount > 0 && (
          <TouchableOpacity
            style={[styles.sortChip, showArchived && styles.sortChipActive]}
            onPress={() => setShowArchived((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={showArchived ? 'Back to songs' : `Show ${archivedCount} archived songs`}
          >
            <Ionicons name={showArchived ? 'archive' : 'archive-outline'} size={16} color={showArchived ? Colors.white : Colors.textSecondary} />
            <Text style={[styles.sortChipLabel, showArchived && styles.sortChipLabelActive]}>{`Archived ${archivedCount}`}</Text>
          </TouchableOpacity>
        )}
      </View>

      {filteredSongs.length === 0 ? (
        songs.length === 0 ? (
          <EmptyState
            icon="library-outline"
            title="Your library is empty"
            message="Add a song to start practicing lyrics and looking up words."
            actionLabel="Create New Lyrics"
            onAction={() => navigation.navigate('Editor')}
          />
        ) : listed.length === 0 ? (
          <EmptyState
            icon="archive-outline"
            title="Every song is archived"
            message="Archived songs keep their words. Open them to put one back."
            actionLabel="Show archived"
            onAction={() => setShowArchived(true)}
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
      {showPlaylists && (
        <SpotifyPlaylists
          onClose={() => setShowPlaylists(false)}
          onOpen={(song) => handlePressSong(song)}
          onFetch={(songName, artistName) => navigation.navigate('Editor', { autoFetchSong: { songName, artistName } })}
          isWide={isWide}
        />
      )}
      {reviewing && <ReviewSession dueItems={reviewing} onClose={() => setReviewing(null)} isWide={isWide} />}
      <ConfirmDialog
        visible={songToDelete !== null}
        title={`Delete Song: ${songToDelete?.songName}`}
        message={songToDelete?.archivedAt
          ? 'This action cannot be undone. Or unarchive it to put it back in the list.'
          : 'This action cannot be undone. Or archive it to hide it from the list and keep its words.'}
        altText={songToDelete?.archivedAt ? 'Unarchive' : 'Archive'}
        onAlt={toggleArchived}
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
    gap: 8,
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
  sortChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sortChipLabelActive: {
    color: Colors.white,
  },
  sortChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  searchInput: {
    flex: 1,
    // Without it the input keeps its default width on web and pushes the buttons beside it off screen
    minWidth: 0,
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ringSlot: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionText: {
    color: Colors.primaryLight,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 184, 148, 0.15)',
  },
  masteredBadge: {
    backgroundColor: 'rgba(253, 203, 110, 0.15)',
  },
  completeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
  },
  masteredText: {
    color: Colors.warning,
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
    flexShrink: 1,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  metaText: {
    flexShrink: 1,
    fontSize: 12,
    color: Colors.textMuted,
  },
  languages: {
    flexDirection: 'row',
    gap: 4,
  },
  flag: {
    fontSize: 14,
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
