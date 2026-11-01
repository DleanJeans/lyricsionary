import React, { useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Text, TextInput } from '../components/Text';
import { useNavigation } from '@react-navigation/native';
import { makeIgnoredWordChecker, useStore } from '../store/useStore';
import { Colors, getMasteryLevelColor } from '../constants/theme';
import { languageKey } from '../constants/languages';
import { MasteryLevel, WordEntry } from '../types';
import ScreenWrapper from '../components/ScreenWrapper';
import { useIsWide } from '../hooks/useLayout';
import { useBackToQuit } from '../hooks/useBackToQuit';
import Toast from '../components/Toast';
import WordCard from '../components/WordCard';
import LanguageTabButtons, { FilterChip } from '../components/LanguageTabButtons';
import MasteryLevelTabs from '../components/MasteryLevelTabs';
import EmptyState from '../components/EmptyState';
import IconButton from '../components/IconButton';
import { countWordOccurrences, WordFrequency } from '../utils/wordFrequency';
import { matchesSearch } from '../utils/search';
import { usePersistedState } from '../hooks/usePersistedState';
import BulkEditBar from '../components/BulkEditBar';
import ReviewSession from '../components/ReviewSession';
import SongFilter from '../components/SongFilter';
import { buildReviewItems, canReview, dueWords, ReviewItem } from '../utils/reviewQuiz';
import { compareMostMissed, isTricky } from '../utils/wordQuiz';

interface PendingDeletion {
  id: string;
  item: WordEntry;
}

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function WordsScreen() {
  const navigation = useNavigation<any>();
  const words = useStore((s) => s.words);
  const deleteWord = useStore((s) => s.deleteWord);
  const deleteWords = useStore((s) => s.deleteWords);
  const setWordsLevel = useStore((s) => s.setWordsLevel);
  // Select mode, for setting the level of or deleting many words at once
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const songs = useStore((s) => s.songs);
  const ignoredWords = useStore((s) => s.ignoredWords);
  const toggleIgnoredWord = useStore((s) => s.toggleIgnoredWord);
  // Top words just ignored with a long press, each with an Undo for a few seconds
  const [justIgnored, setJustIgnored] = useState<WordFrequency[]>([]);
  // Saved or Top view, kept across restarts
  const [showFrequency, setShowFrequency] = usePersistedState('@lyricsionary_words_top_view', false, isBoolean);
  // Top view: only words not saved yet, the ones left to learn
  const [hideSavedInTop, setHideSavedInTop] = usePersistedState('@lyricsionary_words_top_unsaved', false, isBoolean);
  const isWide = useIsWide();
  useBackToQuit();
  const numColumns = isWide ? 2 : 1;
  // Most missed first, by the share of quiz answers that were wrong, kept across restarts
  const [mostMissed, setMostMissed] = usePersistedState('@lyricsionary_words_most_missed', false, isBoolean);
  const sortedWords = [...words].sort((a, b) =>
    (mostMissed ? compareMostMissed(a.quiz, b.quiz) : 0) || b.lastLookedUp - a.lastLookedUp
  );
  const hasMissedWords = words.some((w) => (w.quiz?.wrong ?? 0) > 0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLanguageTabs, setShowLanguageTabs] = useState(true);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<MasteryLevel | null>(null);
  // Only the words saved from this song
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  // Only words answered wrong lately
  const [trickyOnly, setTrickyOnly] = useState(false);
  const [thisWeekOnly, setThisWeekOnly] = useState(false);
  const [reviewing, setReviewing] = useState<ReviewItem[] | null>(null);

  const [pendingDeletions, setPendingDeletions] = useState<PendingDeletion[]>([]);
  const deleteTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Words in saved lyrics sorted by occurrences, excluding ignored words
  const wordFrequencies = React.useMemo(
    () => (showFrequency ? countWordOccurrences(songs, makeIgnoredWordChecker(ignoredWords)) : []),
    [showFrequency, songs, ignoredWords],
  );

  // Get all unique languages from words and count occurrences
  const { availableLanguages, languageCounts } = React.useMemo(() => {
    const counts: Record<string, number> = {};
    (showFrequency ? wordFrequencies : words).forEach((word) => {
      counts[word.language] = (counts[word.language] ?? 0) + 1;
    });
    return {
      availableLanguages: Object.keys(counts).sort(),
      languageCounts: counts,
    };
  }, [words, wordFrequencies, showFrequency]);

  // Saved words by language and lowercase word, for coloring the Top list (the first one wins, like find);
  // keyed by languageKey so a word saved under "French" colors a song's "fr" word. A form merged into
  // a word counts as saved, after any word saved with that spelling
  const savedWordIndex = React.useMemo(() => {
    const reversed = [...words].reverse();
    const key = (w: WordEntry, spelling: string) => `${languageKey(w.language)}\u0000${spelling.toLowerCase()}`;
    return new Map<string, WordEntry>([
      ...reversed.flatMap((w) => (w.forms ?? []).map((form) => [key(w, form), w] as const)),
      ...reversed.map((w) => [key(w, w.word), w] as const),
    ]);
  }, [words]);
  const isSavedFrequency = (w: WordFrequency) => savedWordIndex.has(`${languageKey(w.language)}\u0000${w.word.toLowerCase()}`);

  const languageFrequencies = wordFrequencies.filter(
    (w) => selectedLanguages.length === 0 || selectedLanguages.includes(w.language),
  );
  const unsavedFrequencyCount = languageFrequencies.filter((w) => !isSavedFrequency(w)).length;
  const searchedFrequencies = languageFrequencies.filter(
    (w) => (!hideSavedInTop || !isSavedFrequency(w)) && matchesSearch(w.word, searchQuery),
  );


  const ignoreFrequencyWord = (item: WordFrequency) => {
    void toggleIgnoredWord(item.word, item.language);
    setJustIgnored((prev) => [...prev, item]);
    setTimeout(() => setJustIgnored((prev) => prev.filter((w) => w !== item)), 5000);
  };

  const undoIgnore = (item: WordFrequency) => {
    void toggleIgnoredWord(item.word, item.language);
    setJustIgnored((prev) => prev.filter((w) => w !== item));
  };

  const renderFrequencyItem = ({ item, index }: { item: WordFrequency; index: number }) => {
    const savedWord = savedWordIndex.get(`${languageKey(item.language)}\u0000${item.word.toLowerCase()}`);
    return (
      <TouchableOpacity
        style={styles.frequencyRow}
        onPress={() => navigation.navigate('WordLookup', { word: item.word, originalLanguages: [item.language], source: 'Words' })}
        // A long press ignores the word, e.g. a name or a filler like "oh"
        onLongPress={() => ignoreFrequencyWord(item)}
        accessibilityHint="Long press to ignore"
      >
        <Text style={styles.frequencyRank}>{index + 1}</Text>
        <Text
          style={[styles.frequencyWord, savedWord?.masteryLevel && { color: getMasteryLevelColor(savedWord.masteryLevel) }]}
          numberOfLines={1}
        >
          {item.word}
        </Text>
        <Text style={styles.frequencySongs}>
          {item.songCount} {item.songCount === 1 ? 'song' : 'songs'}
        </Text>
        <Text style={styles.frequencyCount}>×{item.count}</Text>
      </TouchableOpacity>
    );
  };

  const pendingIds = new Set(pendingDeletions.map(d => d.id));
  const filteredWords = sortedWords.filter(w => !pendingIds.has(w.id));

  // Apply language filter
  const onlyLanguageWords =
    selectedLanguages.length > 0 ? filteredWords.filter((w) => selectedLanguages.includes(w.language)) : filteredWords;

  // Songs the language's words were saved from, most words first, for the song filter
  const songsWithWords = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of onlyLanguageWords) {
      for (const songId of new Set((w.contexts ?? []).map((c) => c.songId).filter(Boolean) as string[])) {
        counts.set(songId, (counts.get(songId) ?? 0) + 1);
      }
    }
    return songs
      .filter((song) => counts.has(song.id))
      .map((song) => ({ song, count: counts.get(song.id)! }))
      .sort((a, b) => b.count - a.count);
    // onlyLanguageWords comes from these
  }, [songs, words, selectedLanguages, pendingDeletions]);

  // The song filter applies before the counts and Review, to review one song's words. A song with
  // no words in the chosen languages doesn't filter.
  const songFilterId = songsWithWords.some((s) => s.song.id === selectedSongId) ? selectedSongId : null;
  const languageFilteredWords = songFilterId
    ? onlyLanguageWords.filter((w) => (w.contexts ?? []).some((c) => c.songId === songFilterId))
    : onlyLanguageWords;

  // Count each level among the language's words, then apply the level filter
  const levelCounts: Partial<Record<MasteryLevel, number>> = {};
  for (const w of languageFilteredWords) {
    const level = w.masteryLevel || 'Seen';
    levelCounts[level] = (levelCounts[level] ?? 0) + 1;
  }
  // The words in the chosen languages that a quiz now would move toward their next level. Their quizzes
  // are built when Review is tapped: building them here took seconds with many saved words.
  const due = React.useMemo(
    () => dueWords(languageFilteredWords, Date.now()).filter(canReview),
    // languageFilteredWords comes from these
    [words, selectedLanguages, pendingDeletions, songFilterId],
  );
  const now = Date.now();
  const trickyCount = languageFilteredWords.filter((w) => isTricky(w.quiz, now)).length;
  // Saved in the last 7 days, like the sidebar's count
  const savedThisWeek = (w: WordEntry) => (w.savedAt ?? 0) > now - WEEK_MS;
  const thisWeekCount = languageFilteredWords.filter(savedThisWeek).length;
  const levelFilteredWords = languageFilteredWords.filter(
    (w) =>
      (!selectedLevel || (w.masteryLevel || 'Seen') === selectedLevel) &&
      (!trickyOnly || isTricky(w.quiz, now)) &&
      (!thisWeekOnly || savedThisWeek(w))
  );

  // Apply search filter: the word, its language, IPA or any of its meanings, ignoring accents
  const searchedWords = searchQuery.trim()
    ? levelFilteredWords.filter((w) =>
        [
          w.word,
          w.language,
          w.pronunciation,
          w.note,
          ...(w.forms ?? []),
          ...(w.definitions ?? []).map((d) => d.text),
          ...(w.contexts ?? []).map((c) => c.definition),
        ].some((text) => matchesSearch(text, searchQuery)),
      )
    : levelFilteredWords;

  const toggleSearch = () => {
    if (showSearch) setSearchQuery('');
    setShowSearch((v) => !v);
  };

  const handleDelete = (item: WordEntry, closeSwipeable: () => void) => {
    if (deleteTimeoutsRef.current[item.id]) return;
    setPendingDeletions(prev => [...prev, { id: item.id, item }]);
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

  const searchInput = (
    <TextInput
      style={styles.searchInput}
      placeholder="Search by word, meaning, note or language..."
      placeholderTextColor={Colors.textMuted}
      value={searchQuery}
      onChangeText={setSearchQuery}
      autoFocus={showSearch}
    />
  );

  const languageTabsToggle = (
    <IconButton
      icon="language-outline"
      label={showLanguageTabs ? 'Hide filters' : 'Show filters'}
      onPress={() => setShowLanguageTabs(!showLanguageTabs)}
      selected={selectedLanguages.length > 0 || (showFrequency ? hideSavedInTop : !!selectedLevel || trickyOnly || thisWeekOnly || !!songFilterId)}
    />
  );

  const openSearchButton = (
    <IconButton
      icon={showSearch ? 'close' : 'search'}
      label={showSearch ? 'Close word search' : 'Open word search'}
      onPress={toggleSearch}
    />
  );

  const selectView = (frequency: boolean) => {
    if (frequency === showFrequency) return;
    setShowFrequency(frequency);
    setSelectedLanguages([]);
  };

  const viewSwitch = (
    <View style={styles.viewSwitch} accessibilityRole="tablist">
      {[
        { label: 'Saved', frequency: false },
        { label: 'Top', frequency: true },
      ].map(({ label, frequency }) => {
        const selected = showFrequency === frequency;
        return (
          <TouchableOpacity
            key={label}
            style={[styles.viewSwitchOption, selected && styles.viewSwitchOptionSelected]}
            onPress={() => selectView(frequency)}
            accessibilityRole="tab"
            accessibilityLabel={frequency ? 'Top words' : 'Saved words'}
            accessibilityState={{ selected }}
          >
            <Text style={[styles.viewSwitchLabel, selected && styles.viewSwitchLabelSelected]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <ScreenWrapper>
      <View style={styles.titleRow}>
        {openSearchButton}
        {showSearch ? searchInput : <View style={styles.titleCenter}>{viewSwitch}</View>}
        {languageTabsToggle}
      </View>

      {showLanguageTabs && availableLanguages.length > 0 && (
        <View style={styles.languageTabsContainer}>
          <LanguageTabButtons
            selectedLanguages={selectedLanguages}
            onLanguagesChange={setSelectedLanguages}
            availableLanguages={availableLanguages}
            languageCounts={languageCounts}
          />
          {showFrequency ? (
            <View style={styles.topFilters}>
              <FilterChip
                icon={<Ionicons name="bookmark-outline" size={16} color={hideSavedInTop ? Colors.white : Colors.textSecondary} />}
                label="Not saved"
                count={unsavedFrequencyCount}
                selected={hideSavedInTop}
                onPress={() => setHideSavedInTop(!hideSavedInTop)}
                accessibilityLabel="Only words not saved yet"
              />
              <Text style={styles.topHint}>Long press a word to ignore it</Text>
            </View>
          ) : (
            <MasteryLevelTabs
              selectedLevel={selectedLevel}
              onLevelChange={setSelectedLevel}
              levelCounts={levelCounts}
              leading={<SongFilter songs={songsWithWords} selectedSongId={songFilterId} onChange={setSelectedSongId} />}
            >
              {(thisWeekCount > 0 || thisWeekOnly) && (
                <FilterChip
                  icon={<Ionicons name="calendar-outline" size={16} color={thisWeekOnly ? Colors.white : Colors.primaryLight} />}
                  label="This week"
                  count={thisWeekCount}
                  selected={thisWeekOnly}
                  onPress={() => setThisWeekOnly(!thisWeekOnly)}
                  accessibilityLabel="Words saved in the last 7 days"
                />
              )}
              {(trickyCount > 0 || trickyOnly) && (
                <FilterChip
                  icon={<Ionicons name="alert-circle-outline" size={16} color={trickyOnly ? Colors.white : Colors.warning} />}
                  label="Tricky"
                  count={trickyCount}
                  selected={trickyOnly}
                  onPress={() => setTrickyOnly(!trickyOnly)}
                  accessibilityLabel="Words answered wrong lately"
                />
              )}
              {(hasMissedWords || mostMissed) && (
                <FilterChip
                  icon={<Ionicons name="trending-down" size={16} color={mostMissed ? Colors.white : Colors.danger} />}
                  label="Most missed"
                  count={languageFilteredWords.filter((w) => (w.quiz?.wrong ?? 0) > 0).length}
                  selected={mostMissed}
                  onPress={() => setMostMissed(!mostMissed)}
                  accessibilityLabel="Sort by most missed in quizzes"
                />
              )}
              <FilterChip
                icon={<Ionicons name="checkbox-outline" size={16} color={selecting ? Colors.white : Colors.textSecondary} />}
                label="Select"
                count={selecting ? selectedIds.size : searchedWords.length}
                selected={selecting}
                onPress={() => {
                  setSelecting(!selecting);
                  setSelectedIds(new Set());
                }}
                accessibilityLabel="Select words to edit together"
              />
            </MasteryLevelTabs>
          )}
        </View>
      )}
      {!showFrequency && selecting && (
        <BulkEditBar
          count={selectedIds.size}
          allSelected={searchedWords.length > 0 && searchedWords.every((w) => selectedIds.has(w.id))}
          onToggleAll={() =>
            setSelectedIds(searchedWords.every((w) => selectedIds.has(w.id)) ? new Set() : new Set(searchedWords.map((w) => w.id)))
          }
          onSetLevel={(level) => void setWordsLevel([...selectedIds], level)}
          onDelete={() => {
            void deleteWords([...selectedIds]);
            setSelectedIds(new Set());
          }}
          onDone={() => {
            setSelecting(false);
            setSelectedIds(new Set());
          }}
        />
      )}
      {!showFrequency && !selecting && due.length > 0 && (
        <TouchableOpacity
          style={styles.reviewButton}
          onPress={() => {
            const items = buildReviewItems(due, words);
            if (items.length) setReviewing(items);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Review ${due.length} due ${due.length === 1 ? 'word' : 'words'}`}
        >
          <Ionicons name="flash-outline" size={18} color={Colors.white} />
          <Text style={styles.reviewButtonText}>
            Review {due.length} due {due.length === 1 ? 'word' : 'words'}
          </Text>
        </TouchableOpacity>
      )}
      {reviewing && <ReviewSession dueItems={reviewing} onClose={() => setReviewing(null)} isWide={isWide} />}
      {showFrequency ? (
        searchedFrequencies.length === 0 ? (
          <EmptyState
            icon="stats-chart-outline"
            title={wordFrequencies.length === 0 ? 'No lyrics yet' : 'No words found'}
            message={wordFrequencies.length === 0 ? 'Save a song with lyrics to see its most frequent words.' : 'Try a different search or clear the active filters.'}
          />
        ) : (
          <FlatList
            data={searchedFrequencies}
            keyExtractor={(item) => `${item.language}-${item.word}`}
            renderItem={renderFrequencyItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            initialNumToRender={30}
          />
        )
      ) : searchedWords.length === 0 ? (
        words.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="Build your word bank"
            message="Tap a word in Learn to save its pronunciation and meaning."
            actionLabel="Open Learn"
            onAction={() => navigation.navigate('Learn')}
          />
        ) : (
          <EmptyState
            icon="search-outline"
            title="No words found"
            message="Try a different search or clear the active filters."
            actionLabel="Clear filters"
            onAction={() => {
              setSearchQuery('');
              setSelectedLanguages([]);
              setSelectedLevel(null);
              setTrickyOnly(false);
              setThisWeekOnly(false);
              setSelectedSongId(null);
            }}
          />
        )
      ) : (
        <FlatList
          key={numColumns}
          numColumns={numColumns}
          data={searchedWords}
          keyExtractor={(item) => item.id}
          extraData={selecting ? selectedIds : null}
          renderItem={({ item }) => {
            const card = (
              <WordCard
                item={item}
                isWide={isWide}
                searchQuery={searchQuery}
                showDelete={!selecting}
                showClose={false}
                onDelete={handleDelete}
                source="Words"
              />
            );
            if (!selecting) return card;
            const checked = selectedIds.has(item.id);
            // The card under a cover that takes the taps, to select it instead of opening it
            return (
              <View style={[styles.selectable, isWide && styles.selectableWide]}>
                {card}
                <TouchableOpacity
                  style={[styles.selectCover, checked && styles.selectCoverChecked]}
                  onPress={() =>
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })
                  }
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={`Select ${item.word}`}
                >
                  <Ionicons name={checked ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={checked ? Colors.primary : Colors.textMuted} />
                </TouchableOpacity>
              </View>
            );
          }}
          columnWrapperStyle={isWide ? styles.row : undefined}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
      <View style={styles.toastStack} pointerEvents="box-none">
        {justIgnored.map((item) => (
          <Toast
            key={`ignored-${item.language}-${item.word}`}
            message={
              <>
                Ignored
                <Text style={{ fontWeight: 'bold' }}> {item.word}</Text>
              </>
            }
            onUndo={() => undoIgnore(item)}
          />
        ))}
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
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  reviewButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  titleCenter: {
    flex: 1,
    alignItems: 'center',
  },
  viewSwitch: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
  },
  viewSwitchOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 11,
  },
  viewSwitchOptionSelected: {
    backgroundColor: Colors.primary,
  },
  viewSwitchLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  viewSwitchLabelSelected: {
    color: Colors.text,
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
  selectable: {
    position: 'relative',
  },
  selectableWide: {
    flex: 1,
  },
  selectCover: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectCoverChecked: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(108,92,231,0.12)',
  },
  toastStack: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    gap: 8,
    zIndex: 1000,
  },
  languageTabsContainer: {
    marginBottom: 12,
  },
  topHint: {
    flexShrink: 1,
    fontSize: 12,
    color: Colors.textMuted,
  },
  topFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  frequencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  frequencyRank: {
    minWidth: 28,
    fontSize: 13,
    color: Colors.textMuted,
  },
  frequencyWord: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  frequencySongs: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  frequencyCount: {
    minWidth: 40,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primaryLight,
  },
});
