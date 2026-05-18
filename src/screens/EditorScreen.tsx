import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  Image,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useStore } from '../store/useStore';
import { Colors } from '../constants/theme';
import { LANGUAGES } from '../constants/languages';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenWrapper from '../components/ScreenWrapper';
import { useIsWide } from '../hooks/useLayout';
import { GOOGLE_SEARCH_URL } from '../constants/urls';
import { getFaviconUrl } from '../utils/getFaviconUrl';
import {
  hasNotificationPermission,
  requestNotificationPermission,
  getCurrentlyPlayingMedia,
} from '../services/mediaNotification';
import { useBackToQuit } from '../hooks/useBackToQuit';
import { Translation } from '../types';
import MultiLanguageSelect from '../components/MultiLanguageSelect';
import SongMetadataHeader from '../components/SongMetadataHeader';


export default function EditorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isWide = useIsWide();
  useBackToQuit();

  const { songs, saveSong, updateSong, currentSongId, setCurrentSongId, setWebUrl, setScrapeTargetTab } = useStore();

  const paramSongId = route.params?.songId as string | undefined;
  const [editSongId, setEditSongId] = useState<string | undefined>(paramSongId);
  useEffect(() => {
    if (paramSongId !== undefined) setEditSongId(paramSongId);
  }, [paramSongId]);
  const editSong = editSongId ? songs.find((s) => s.id === editSongId) : null;

  const [songName, setSongName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [originalLyrics, setOriginalLyrics] = useState('');
  const [originalLanguages, setOriginalLanguages] = useState<string[]>([]);
  const [songSourceUrl, setSongSourceUrl] = useState('');
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [showSourceUrl, setShowSourceUrl] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].name);
  const [pendingSourceUrls, setPendingSourceUrls] = useState<Record<number, string>>({});
  const [pendingPageTitles, setPendingPageTitles] = useState<Record<number, string>>({});
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const metadataContainerRef = useRef<View>(null);

  // Track original state for Reset button
  const [originalState, setOriginalState] = useState<{
    songName: string;
    artistName: string;
    originalLyrics: string;
    originalLanguages: string[];
    songSourceUrl: string;
    translations: Translation[];
  } | null>(null);

  useEffect(() => {
    if (editSong) {
      setSongName(editSong.songName);
      setArtistName(editSong.artistName);
      setOriginalLyrics(editSong.originalLyrics);
      setOriginalLanguages(editSong.originalLanguages ?? []);
      setSongSourceUrl(editSong.sourceUrl ?? '');
      setTranslations(editSong.translations.map((t) => ({ ...t })));
      setPendingSourceUrls({});
      const titles: Record<number, string> = {};
      if (editSong.sourceUrlTitle) titles[0] = editSong.sourceUrlTitle;
      editSong.translations.forEach((t, i) => {
        if (t.sourceUrlTitle) titles[i + 1] = t.sourceUrlTitle;
      });
      setPendingPageTitles(titles);
      // Save original state for Reset functionality
      setOriginalState({
        songName: editSong.songName,
        artistName: editSong.artistName,
        originalLyrics: editSong.originalLyrics,
        originalLanguages: editSong.originalLanguages ?? [],
        songSourceUrl: editSong.sourceUrl ?? '',
        translations: editSong.translations.map((t) => ({ ...t })),
      });
    } else {
      setOriginalState(null);
    }
  }, [editSong?.id]);

  // Auto-show editing mode when both song name and artist name are empty
  useEffect(() => {
    setIsEditingMetadata(!songName.trim() && !artistName.trim());
  }, [songName, artistName]);

  useEffect(() => { setScrapeTargetTab(activeTab); }, [activeTab]);

  // Handle all scraped data from Web screen in one effect to avoid param-clearing races
  useEffect(() => {
    const scraped = route.params?.scrapedLyrics as string | undefined;
    if (!scraped) return;
    const targetTab = (route.params?.scrapedTargetTab as number | undefined) ?? 0;
    const url = route.params?.scrapedSourceUrl as string | undefined;
    const title = route.params?.scrapedPageTitle as string | undefined;
    if (targetTab === 0) {
      setOriginalLyrics(scraped);
    } else {
      setTranslations((prev) => {
        const updated = [...prev];
        if (updated[targetTab - 1]) updated[targetTab - 1] = { ...updated[targetTab - 1], lyrics: scraped };
        return updated;
      });
    }
    if (url) setPendingSourceUrls((prev) => ({ ...prev, [targetTab]: url }));
    if (title !== undefined) setPendingPageTitles((prev) => ({ ...prev, [targetTab]: title }));
    setActiveTab(targetTab);
    if (url) setShowSourceUrl(true);
    navigation.setParams({ scrapedLyrics: undefined, scrapedSourceUrl: undefined, scrapedPageTitle: undefined, scrapedTargetTab: undefined });
  }, [route.params?.scrapedLyrics]);

  const isEditMode = !!editSong;
  const allEmpty = !songName && !artistName && !originalLyrics && translations.every((t) => !t.lyrics);
  const searchDisabled = !songName.trim() && !artistName.trim();

  // Check if current state differs from original (for Reset button)
  const hasChanges = originalState ? (
    songName !== originalState.songName ||
    artistName !== originalState.artistName ||
    originalLyrics !== originalState.originalLyrics ||
    JSON.stringify(originalLanguages) !== JSON.stringify(originalState.originalLanguages) ||
    songSourceUrl !== originalState.songSourceUrl ||
    JSON.stringify(translations) !== JSON.stringify(originalState.translations)
  ) : false;

  const currentLyrics = activeTab === 0 ? originalLyrics : translations[activeTab - 1]?.lyrics ?? '';
  const setCurrentLyrics = (text: string) => {
    if (activeTab === 0) {
      setOriginalLyrics(text);
    } else {
      const updated = [...translations];
      updated[activeTab - 1] = { ...updated[activeTab - 1], lyrics: text };
      setTranslations(updated);
    }
  };

  const currentSourceUrl = pendingSourceUrls[activeTab] ?? (activeTab === 0 ? songSourceUrl : translations[activeTab - 1]?.sourceUrl ?? '');
  const pageTitle = pendingPageTitles[activeTab] ?? '';

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setCurrentLyrics(text);
  };

  const handleSave = async () => {
    if (!songName.trim()) {
      Alert.alert('Missing Info', 'Please enter a song name.');
      return;
    }
    const resolvedSourceUrl = (pendingSourceUrls[0] ?? songSourceUrl).trim() || undefined;
    const resolvedSourceUrlTitle = resolvedSourceUrl ? (pendingPageTitles[0] || undefined) : undefined;
    const resolvedTranslations = translations.map((t, i) =>
      pendingSourceUrls[i + 1] !== undefined
        ? { ...t, sourceUrl: pendingSourceUrls[i + 1], sourceUrlTitle: pendingPageTitles[i + 1] || undefined }
        : t
    );
    if (isEditMode && editSong) {
      await updateSong(editSong.id, {
        songName: songName.trim(),
        artistName: artistName.trim(),
        originalLyrics,
        originalLanguages,
        sourceUrl: resolvedSourceUrl,
        sourceUrlTitle: resolvedSourceUrlTitle,
        translations: resolvedTranslations,
      });
      setCurrentSongId(editSong.id);
      // Update the original state to reflect the new saved state
      setOriginalState({
        songName: songName.trim(),
        artistName: artistName.trim(),
        originalLyrics,
        originalLanguages: [...originalLanguages],
        songSourceUrl: resolvedSourceUrl ?? '',
        translations: resolvedTranslations.map((t) => ({ ...t })),
      });
      // Clear pending URLs since they are now saved
      setPendingSourceUrls({});
      const titles: Record<number, string> = {};
      if (resolvedSourceUrlTitle) titles[0] = resolvedSourceUrlTitle;
      resolvedTranslations.forEach((t, i) => {
        if (t.sourceUrlTitle) titles[i + 1] = t.sourceUrlTitle;
      });
      setPendingPageTitles(titles);
    } else {
      const song = await saveSong(songName.trim(), artistName.trim(), originalLyrics, originalLanguages, resolvedTranslations, resolvedSourceUrl, resolvedSourceUrlTitle);
      setCurrentSongId(song.id);
      handleClear();
      navigation.navigate('Learn');
    }
  };

  const handleClear = () => {
    setSongName('');
    setArtistName('');
    setOriginalLyrics('');
    setOriginalLanguages([]);
    setSongSourceUrl('');
    setTranslations([]);
    setActiveTab(0);
    setPendingSourceUrls({});
    setPendingPageTitles({});
    setEditSongId(undefined);
    navigation.setParams({ songId: undefined });
  };

  const handleReset = () => {
    if (originalState) {
      setSongName(originalState.songName);
      setArtistName(originalState.artistName);
      setOriginalLyrics(originalState.originalLyrics);
      setOriginalLanguages([...originalState.originalLanguages]);
      setSongSourceUrl(originalState.songSourceUrl);
      setTranslations(originalState.translations.map((t) => ({ ...t })));
      setActiveTab(0);
      setPendingSourceUrls({});
      setPendingPageTitles({});
    }
  };

  const handleNew = () => {
    handleClear();
  };

  const handleBack = () => {
    if (currentSongId) {
      setEditSongId(currentSongId);
      navigation.setParams({ songId: currentSongId });
    }
  };

  const handleGoogleSearch = () => {
    const query = encodeURIComponent(`${songName} ${artistName} lyrics`);
    setWebUrl(`${GOOGLE_SEARCH_URL}&q=${query}`);
    navigation.navigate('Web');
  };

  const handleAddTranslation = () => {
    const alreadyAdded = translations.some((t) => t.language === selectedLanguage);
    if (alreadyAdded) {
      Alert.alert('Duplicate', `${selectedLanguage} translation already exists.`);
      return;
    }
    setTranslations([...translations, { language: selectedLanguage, lyrics: '' }]);
    setActiveTab(translations.length + 1);
    setShowAddDialog(false);
  };

  const handleGetCurrentlyPlaying = async () => {
    try {
      // Check if permission is granted
      const hasPermission = await hasNotificationPermission();

      if (!hasPermission) {
        // Show alert asking user to grant permission
        Alert.alert(
          'Permission Required',
          'To read currently playing songs, this app needs notification access. You will be taken to Settings to enable it.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: async () => {
                try {
                  await requestNotificationPermission();
                } catch (error) {
                  Alert.alert('Error', 'Could not open settings. Please enable notification access manually in Settings → Apps → Lyricsionary → Notifications.');
                }
              },
            },
          ]
        );
        return;
      }

      const mediaInfo = await getCurrentlyPlayingMedia();

      if (mediaInfo) {
        setSongName(mediaInfo.songName);
        setArtistName(mediaInfo.artistName);
      } else {
        Alert.alert(
          'No Media Playing',
          'Could not detect any currently playing music. Please make sure a music app (Spotify, YouTube, etc.) is actively playing a song.'
        );
      }
    } catch (error) {
      console.error('Error getting currently playing media:', error);
      Alert.alert(
        'Error',
        'Failed to read currently playing media. Please make sure notification access is enabled in Settings.'
      );
    }
  };

  /* ─── Shared Controls ─────────────────────────────────────── */
  const infoPanel = (
    <View style={[styles.infoPanel, isWide && styles.infoPanelWide]}>
      <View style={[styles.header, { justifyContent: isEditMode ? 'flex-start' : (currentSongId ? 'space-between' : 'flex-end') }]}>
        {isEditMode && (
          <TouchableOpacity style={styles.iconButton} onPress={handleNew}>
            <Ionicons name="add" size={22} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {!isEditMode && currentSongId && (
          <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{isEditMode ? 'Edit Lyrics' : 'New Lyrics'}</Text>
        {!isEditMode && (
          <TouchableOpacity style={styles.iconButton} onPress={handleGetCurrentlyPlaying}>
            <Ionicons name="musical-note" size={22} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      <TouchableWithoutFeedback onPress={() => setIsEditingMetadata(false)}>
        <View>
          <TouchableWithoutFeedback>
            <View ref={metadataContainerRef}>
              <SongMetadataHeader
                songName={songName}
                artistName={artistName}
                originalLanguages={originalLanguages}
                isEditing={isEditingMetadata}
                onPress={() => setIsEditingMetadata(true)}
                onSongNameChange={setSongName}
                onArtistNameChange={setArtistName}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
      <View style={[styles.inputRow, { gap: 14 }]}>
        <Ionicons name="language-outline" size={20} color={Colors.textSecondary} />
        <MultiLanguageSelect
          value={originalLanguages}
          onValueChange={setOriginalLanguages}
          placeholder="Original Language(s)"
        />
      </View>
      {!currentLyrics && (
        <TouchableOpacity
          style={[styles.searchButton, searchDisabled && styles.disabled]}
          disabled={searchDisabled}
          onPress={handleGoogleSearch}
        >
          <Ionicons name="search" size={18} color={Colors.white} />
          <Text style={styles.searchButtonText}>Google Search</Text>
        </TouchableOpacity>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, styles.originalTab, activeTab === 0 && styles.tabActive]}
          onPress={() => {
            if (activeTab === 0) {
              setShowSourceUrl(!showSourceUrl);
            } else {
              setActiveTab(0);
              setShowSourceUrl(true);
            }
          }}
        >
          {getFaviconUrl(pendingSourceUrls[0] ?? songSourceUrl) && (
            <Image source={{ uri: getFaviconUrl(pendingSourceUrls[0] ?? songSourceUrl)! }} style={styles.tabFavicon} />
          )}
          <Text style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}>Original</Text>
        </TouchableOpacity>
        {translations.map((t, i) => (
          <View key={t.language} style={styles.tabWrapper}>
            <TouchableOpacity
              style={[styles.tab, activeTab === i + 1 && styles.tabActive]}
              onPress={() => {
                if (activeTab === i + 1) {
                  setShowSourceUrl(!showSourceUrl);
                } else {
                  setActiveTab(i + 1);
                  setShowSourceUrl(true);
                }
              }}
            >
              {getFaviconUrl(pendingSourceUrls[i + 1] ?? t.sourceUrl ?? '') && (
                <Image source={{ uri: getFaviconUrl(pendingSourceUrls[i + 1] ?? t.sourceUrl ?? '')! }} style={styles.tabFavicon} />
              )}
              <Text style={[styles.tabText, activeTab === i + 1 && styles.tabTextActive]}>{t.language}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                Alert.alert(
                  'Delete Translation',
                  `Are you sure you want to delete the ${t.language} translation?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        const newTranslations = translations.filter((_, idx) => idx !== i);
                        setTranslations(newTranslations);
                        // Clean up pending data for this tab
                        const newPendingUrls = { ...pendingSourceUrls };
                        const newPendingTitles = { ...pendingPageTitles };
                        delete newPendingUrls[i + 1];
                        delete newPendingTitles[i + 1];
                        // Shift indices for tabs after the deleted one
                        Object.keys(newPendingUrls).forEach((key) => {
                          const idx = parseInt(key);
                          if (idx > i + 1) {
                            newPendingUrls[idx - 1] = newPendingUrls[idx];
                            delete newPendingUrls[idx];
                          }
                        });
                        Object.keys(newPendingTitles).forEach((key) => {
                          const idx = parseInt(key);
                          if (idx > i + 1) {
                            newPendingTitles[idx - 1] = newPendingTitles[idx];
                            delete newPendingTitles[idx];
                          }
                        });
                        setPendingSourceUrls(newPendingUrls);
                        setPendingPageTitles(newPendingTitles);
                        // Switch to Original tab if we deleted the active tab
                        if (activeTab === i + 1) {
                          setActiveTab(0);
                        } else if (activeTab > i + 1) {
                          // Adjust active tab index if it's after the deleted tab
                          setActiveTab(activeTab - 1);
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Ionicons name="close" size={14} color={activeTab === i + 1 ? Colors.white : Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addTab} onPress={() => setShowAddDialog(true)}>
          <Ionicons name="add" size={20} color={Colors.primary} />
          <Text style={styles.addTabText}>Add Translation</Text>
        </TouchableOpacity>
      </ScrollView>
      {showSourceUrl && !!currentSourceUrl && (
        <TouchableOpacity style={styles.sourceUrlRow} onPress={() => { setWebUrl(currentSourceUrl); navigation.navigate('Web'); }}>
          {getFaviconUrl(currentSourceUrl) ? (
            <Image source={{ uri: getFaviconUrl(currentSourceUrl)! }} style={styles.sourceUrlIcon} />
          ) : (
            <Ionicons name="link-outline" size={20} color={Colors.textSecondary} />
          )}
          <Text style={styles.sourceUrlText} numberOfLines={1}>{pageTitle || currentSourceUrl}</Text>
        </TouchableOpacity>
      )}
      {isWide && (
        <View style={styles.actions}>
          {currentLyrics.split('\n').length === 0 ? (
            <TouchableOpacity style={styles.actionButton} onPress={handlePaste}>
              <Ionicons name="clipboard-outline" size={20} color={Colors.white} />
              <Text style={styles.actionButtonText}>Paste</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton, isEditMode && !hasChanges && styles.disabled]}
              disabled={isEditMode && !hasChanges}
              onPress={handleSave}
            >
              <Ionicons name="checkmark" size={20} color={Colors.white} />
              <Text style={styles.actionButtonText}>Save</Text>
            </TouchableOpacity>
          )}
          {isEditMode ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton, !hasChanges && styles.disabled]}
              disabled={!hasChanges}
              onPress={handleReset}
            >
              <Ionicons name="refresh" size={20} color={Colors.white} />
              <Text style={styles.actionButtonText}>Reset</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton, allEmpty && styles.disabled]}
              disabled={allEmpty}
              onPress={handleClear}
            >
              <Ionicons name="close" size={20} color={Colors.white} />
              <Text style={styles.actionButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  const logicalLines = currentLyrics.split('\n');
  const [lineHeights, setLineHeights] = useState<number[]>(() => logicalLines.map(() => 24));

  const handleTextLayout = useCallback(
    (e: { nativeEvent: { lines: Array<{ text: string; height: number }> } }) => {
      const renderedLines = e.nativeEvent.lines;
      const logical = currentLyrics.split('\n');
      const heights: number[] = [];
      let rIdx = 0;
      for (const logicalLine of logical) {
        let accumulated = 0;
        let logicalHeight = 0;
        while (rIdx < renderedLines.length) {
          const rLine = renderedLines[rIdx];
          logicalHeight += rLine.height;
          accumulated += rLine.text.length;
          rIdx++;
          if (accumulated >= logicalLine.length) break;
        }
        heights.push(logicalHeight || 24);
      }
      setLineHeights(heights);
    },
    [currentLyrics],
  );

  const lyricsPanel = (
    <View style={[styles.lyricsContainer, isWide && styles.lyricsContainerWide]}>
      <View style={styles.lyricsInputWrapper}>
        <ScrollView
          style={styles.lyricsScroll}
          decelerationRate="normal"
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.lyricsRow}>
            <View style={styles.lineNumbersColumn}>
              {logicalLines.map((_, i) => (
                <View key={i} style={{ height: lineHeights[i] ?? 24, justifyContent: 'flex-start' }}>
                  <Text style={styles.lineNumber}>{i + 1}</Text>
                </View>
              ))}
            </View>
            <TextInput
              style={styles.lyricsInput}
              multiline
              scrollEnabled={false}
              placeholder="Paste or type lyrics here..."
              placeholderTextColor={Colors.textMuted}
              value={currentLyrics}
              onChangeText={setCurrentLyrics}
              textAlignVertical="top"
            />
            <View style={styles.lyricsInputMeasureContainer} pointerEvents="none">
              <Text style={styles.lyricsInputMeasure} onTextLayout={handleTextLayout}>
                {currentLyrics}
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );

  return (
    <ScreenWrapper>
      {isWide ? (
        <View style={styles.wideLayout}>
          {infoPanel}
          <View style={styles.wideDivider} />
          {lyricsPanel}
        </View>
      ) : (
        <View style={styles.narrowLayout}>
          {infoPanel}
          {lyricsPanel}
          <View style={styles.actions}>
            {currentLyrics.split('\n').length === 0 ? (
              <TouchableOpacity style={styles.actionButton} onPress={handlePaste}>
                <Ionicons name="clipboard-outline" size={20} color={Colors.white} />
                <Text style={styles.actionButtonText}>Paste</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton, isEditMode && !hasChanges && styles.disabled]}
                disabled={isEditMode && !hasChanges}
                onPress={handleSave}
              >
                <Ionicons name="checkmark" size={20} color={Colors.white} />
                <Text style={styles.actionButtonText}>Save</Text>
              </TouchableOpacity>
            )}
            {isEditMode ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton, !hasChanges && styles.disabled]}
                disabled={!hasChanges}
                onPress={handleReset}
              >
                <Ionicons name="refresh" size={20} color={Colors.white} />
                <Text style={styles.actionButtonText}>Reset</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton, allEmpty && styles.disabled]}
                disabled={allEmpty}
                onPress={handleClear}
              >
                <Ionicons name="close" size={20} color={Colors.white} />
                <Text style={styles.actionButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Add Translation Modal */}
      <Modal visible={showAddDialog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Translation</Text>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              style={styles.languageList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    selectedLanguage === item.name && styles.languageItemSelected,
                  ]}
                  onPress={() => setSelectedLanguage(item.name)}
                >
                  <Text style={styles.languageFlag}>{item.flag}</Text>
                  <Text style={styles.languageName}>{item.name}</Text>
                  {selectedLanguage === item.name && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddDialog(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalAdd} onPress={handleAddTranslation}>
                <Text style={styles.modalAddText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  /* Layouts */
  wideLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  narrowLayout: {
    flex: 1,
  },
  wideDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 14,
  },
  infoPanel: {},
  infoPanelWide: {
    flex: 2,
  },
  lyricsContainerWide: {
    flex: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 16,
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
  iconButton: {
    padding: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    zIndex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    paddingVertical: 14,
    marginLeft: 10,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 16,
  },
  searchButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.35,
  },
  tabBar: {
    flexGrow: 0,
    marginBottom: 10,
  },
  tabWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    position: 'relative',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    paddingRight: 32,
  },
  originalTab: {
    paddingRight: 16,
    marginRight: 8,
  },
  deleteButton: {
    marginLeft: -24,
    marginRight: 10,
  },
  tabFavicon: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  sourceUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    marginBottom: 10,
    gap: 10,
  },
  sourceUrlIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  sourceUrlText: {
    flex: 1,
    color: Colors.primary,
    fontSize: 14,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.white,
  },
  addTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    gap: 4,
  },
  addTabText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  lyricsContainer: {
    flex: 1,
    marginBottom: 10,
  },
  lyricsInputWrapper: {
    flex: 1,
    minHeight: 120,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  lyricsScroll: {
    flex: 1,
  },
  lyricsRow: {
    flexDirection: 'row',
  },
  lineNumbersColumn: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 8,
    backgroundColor: Colors.background,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    alignItems: 'flex-end',
    minWidth: 36,
  },
  lineNumber: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'right',
  },
  lyricsInput: {
    flex: 1,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  lyricsInputMeasureContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lyricsInputMeasure: {
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    opacity: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 16,
  },
  actionButton: {
    flex: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  saveButton: {
    backgroundColor: Colors.success,
  },
  dangerButton: {
    flex: 4,
    backgroundColor: Colors.danger,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 440,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  languageList: {
    maxHeight: 300,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  languageItemSelected: {
    backgroundColor: Colors.surfaceLight,
  },
  languageFlag: {
    fontSize: 22,
  },
  languageName: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  modalAdd: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  modalAddText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
