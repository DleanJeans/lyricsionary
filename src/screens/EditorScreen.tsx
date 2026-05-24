import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useStore } from '../store/useStore';
import { Colors } from '../constants/theme';
import { LANGUAGES, getLanguageNameFromCode } from '../constants/languages';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenWrapper from '../components/ScreenWrapper';
import { useIsWide } from '../hooks/useLayout';
import { GOOGLE_SEARCH_URL, DEEPL_URL } from '../constants/urls';
import { getFaviconUrl } from '../utils/getFaviconUrl';
import {
  hasNotificationPermission,
  requestNotificationPermission,
  getCurrentlyPlayingMedia,
} from '../services/mediaNotification';
import { useBackToQuit } from '../hooks/useBackToQuit';
import { Translation } from '../types';
import FabBubble from '../components/FabBubble';
import SongMetadataHeader from '../components/SongMetadataHeader';
import { deduplicateLines } from '../utils/deeplTranslation';
import LyricsEditor from '../components/LyricsEditor';


export default function EditorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isWide = useIsWide();
  useBackToQuit();

  const {
    songs,
    saveSong,
    updateSong,
    currentSongId,
    setCurrentSongId,
    setWebUrl,
    setScrapeTargetTab,
    setMatchedSongs,
    matchedSongsSearchQuery,
    matchedSongsCount,
    setDeeplLineMap,
  } = useStore();

  const paramSongId = route.params?.songId as string | undefined;
  const [editSongId, setEditSongId] = useState<string | undefined>(paramSongId);
  useEffect(() => {
    if (paramSongId !== undefined) setEditSongId(paramSongId);
  }, [paramSongId]);
  const editSong = editSongId ? songs.find((s) => s.id === editSongId) : null;
  const isEditMode = !!editSong;

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
  const [isEditingMetadata, setIsEditingMetadata] = useState(true);
  const [isShowingOriginal, setIsShowingOriginal] = useState(false);
  
  
  const skipMatchingRef = useRef(false);

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
      // Set metadata to not editing when loading an existing song
      setIsEditingMetadata(false);
    } else {
      setOriginalState(null);
    }
  }, [editSong?.id]);

  useEffect(() => { setScrapeTargetTab(activeTab); }, [activeTab]);

  // Search for matching songs when song name or artist name changes
  useEffect(() => {
    if (isEditMode) {
      setMatchedSongs(null, 0);
      return;
    }

    if (skipMatchingRef.current) {
      skipMatchingRef.current = false;
      setMatchedSongs(null, 0);
      return;
    }

    const trimmedSongName = songName.trim();
    const trimmedArtistName = artistName.trim();

    if (!trimmedSongName && !trimmedArtistName) {
      setMatchedSongs(null, 0);
      return;
    }

    const searchQuery = trimmedSongName || trimmedArtistName;
    const matchedSongs = songs.filter((s) => {
      if (trimmedSongName && trimmedArtistName) {
        // If both are provided, match on both
        return (
          s.songName.toLowerCase().includes(trimmedSongName.toLowerCase()) &&
          s.artistName.toLowerCase().includes(trimmedArtistName.toLowerCase())
        );
      } else if (trimmedSongName) {
        // Match on song name
        return s.songName.toLowerCase().includes(trimmedSongName.toLowerCase());
      } else {
        // Match on artist name
        return s.artistName.toLowerCase().includes(trimmedArtistName.toLowerCase());
      }
    });

    setMatchedSongs(searchQuery, matchedSongs.length);
  }, [songName, artistName, isEditMode, songs]);

  // Handle all scraped data from Web screen in one effect to avoid param-clearing races
  useEffect(() => {
    const scraped = route.params?.scrapedLyrics as string | undefined;
    if (!scraped) return;
    const targetTab = (route.params?.scrapedTargetTab as number | undefined) ?? 0;
    const url = route.params?.scrapedSourceUrl as string | undefined;
    const title = route.params?.scrapedPageTitle as string | undefined;
    const languageCode = route.params?.scrapedLanguageCode as string | undefined;
    const translationText = route.params?.scrapedTranslationText as string | undefined;
    const translationLanguage = route.params?.scrapedTranslationLanguage as string | undefined;

    if (targetTab === 0) {
      setOriginalLyrics(scraped);
      // Auto-fill language only for original lyrics (tab 0) and when language is detected
      if (languageCode) {
        const languageName = getLanguageNameFromCode(languageCode);
        if (languageName && !originalLanguages.includes(languageName)) {
          setOriginalLanguages((prev) => {
            // Only add if not already present
            if (prev.includes(languageName)) return prev;
            return [...prev, languageName];
          });
        }
      }
      if (translationText && translationLanguage) {
        const matchedLang = LANGUAGES.find(
          l => l.name.toLowerCase() === translationLanguage.toLowerCase() || l.code.toLowerCase() === translationLanguage.toLowerCase()
        );
        const finalLangName = matchedLang ? matchedLang.name : translationLanguage;
        setTranslations(prev => {
          if (prev.some(t => t.language === finalLangName)) {
            return prev.map(t => t.language === finalLangName ? { ...t, lyrics: translationText.trim(), sourceUrl: url, sourceUrlTitle: title || undefined } : t);
          }
          return [...prev, { language: finalLangName, lyrics: translationText.trim(), sourceUrl: url, sourceUrlTitle: title || undefined }];
        });
      }
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
    navigation.setParams({ scrapedLyrics: undefined, scrapedSourceUrl: undefined, scrapedPageTitle: undefined, scrapedTargetTab: undefined, scrapedLanguageCode: undefined, scrapedTranslationText: undefined, scrapedTranslationLanguage: undefined });
  }, [route.params?.scrapedLyrics]);

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

  type ResolvedSourceData = {
    sourceUrl: string | undefined;
    sourceUrlTitle: string | undefined;
    translations: Translation[];
  };

  // #region Save Logic
  const handleSave = async () => {
    if (!songName.trim()) {
      Alert.alert('Missing Info', 'Please enter a song name.');
      return;
    }
    const resolved = resolveSourceUrls();
    if (isEditMode && editSong) {
      await handleUpdatingSavedSong(resolved);
    } else {
      await handleSavingNewSong(resolved);
    }
  };

  const resolveSourceUrls = (): ResolvedSourceData => {
    const sourceUrl = (pendingSourceUrls[0] ?? songSourceUrl).trim() || undefined;
    const sourceUrlTitle = sourceUrl ? (pendingPageTitles[0] || undefined) : undefined;
    const resolvedTranslations = translations.map((t, i) => {
      const hasPendingUrl = pendingSourceUrls[i + 1] !== undefined;
      return {
        ...t,
        sourceUrl: hasPendingUrl ? pendingSourceUrls[i + 1] : t.sourceUrl,
        sourceUrlTitle: hasPendingUrl ? (pendingPageTitles[i + 1] || undefined) : t.sourceUrlTitle,
      };
    });
    return { sourceUrl, sourceUrlTitle, translations: resolvedTranslations };
  };

  const handleUpdatingSavedSong = async (resolved: ResolvedSourceData) => {
    if (!editSong) return;
    await updateSong(editSong.id, {
      songName: songName.trim(),
      artistName: artistName.trim(),
      originalLyrics,
      originalLanguages,
      sourceUrl: resolved.sourceUrl,
      sourceUrlTitle: resolved.sourceUrlTitle,
      translations: resolved.translations,
    });
    setCurrentSongId(editSong.id);
    setOriginalState({
      songName: songName.trim(),
      artistName: artistName.trim(),
      originalLyrics,
      originalLanguages: [...originalLanguages],
      songSourceUrl: resolved.sourceUrl ?? '',
      translations: resolved.translations.map((t) => ({ ...t })),
    });
    setPendingSourceUrls({});
    const titles: Record<number, string> = {};
    if (resolved.sourceUrlTitle) titles[0] = resolved.sourceUrlTitle;
    resolved.translations.forEach((t, i) => {
      if (t.sourceUrlTitle) titles[i + 1] = t.sourceUrlTitle;
    });
    setPendingPageTitles(titles);
  };

  const handleSavingNewSong = async (resolved: ResolvedSourceData) => {
    skipMatchingRef.current = true;
    const song = await saveSong(songName.trim(), artistName.trim(), originalLyrics, originalLanguages, resolved.translations, resolved.sourceUrl, resolved.sourceUrlTitle);
    setCurrentSongId(song.id);
    setEditSongId(song.id);
    navigation.setParams({ songId: song.id });
    navigation.navigate('Learn');
    setIsEditingMetadata(false);
  };
  // #endregion

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
    setIsEditingMetadata(true);
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
      setIsEditingMetadata(false);
    }
  };

  const handleGoogleSearch = () => {
    const query = encodeURIComponent(`${songName} ${artistName} lyrics`);
    setWebUrl(`${GOOGLE_SEARCH_URL}&q=${query}`);
    navigation.navigate('Web');
  };

  const handleGetTranslation = () => {
    if (activeTab === 0 || !originalLyrics) return; // Only works for translation tabs

    // Deduplicate lines to fit within DeepL's 1500 character limit
    const { deduplicated, lineMap } = deduplicateLines(originalLyrics);

    // Store the line map in the store so WebScreen can remap the translation
    setDeeplLineMap(lineMap);

    // Navigate to DeepL
    setWebUrl(DEEPL_URL);
    navigation.navigate('Web', { pasteIntoDeepL: deduplicated });
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

  const handleMatchedSongsFabPress = () => {
    const { matchedSongsSearchQuery } = useStore.getState();
    if (matchedSongsSearchQuery) {
      navigation.navigate('Songs', { searchQuery: matchedSongsSearchQuery });
    }
  };

  /* ─── Shared Controls ─────────────────────────────────────── */
  const buttonDisplayPositions = isEditMode ? 'flex-end' : (currentSongId ? 'space-between' : 'flex-end');
  const infoPanel = (
    <View style={[styles.infoPanel, isWide && styles.infoPanelWide]}>
      <View style={[styles.header, { justifyContent: buttonDisplayPositions }]}>
        {!isEditMode && currentSongId && (
          <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {isEditingMetadata && <Text style={styles.title}>{isEditMode ? 'Edit Lyrics' : 'New Lyrics'}</Text>}
        {!isEditingMetadata && (
          <View style={styles.titleReplacement}>
            <SongMetadataHeader
              songName={songName}
              artistName={artistName}
              originalLanguages={originalLanguages}
              isEditing={false}
              onPress={() => setIsEditingMetadata(true)}
            />
          </View>
        )}
        <View style={styles.headerRight}>
          {isEditMode && (
            <TouchableOpacity style={styles.iconButton} onPress={handleNew}>
              <Ionicons name="add" size={22} color={Colors.primary} />
            </TouchableOpacity>
          )}
          {!isEditMode && (
            <TouchableOpacity style={styles.iconButton} onPress={handleGetCurrentlyPlaying}>
              <Ionicons name="musical-note" size={22} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {isEditingMetadata && (
        <SongMetadataHeader
          songName={songName}
          artistName={artistName}
          originalLanguages={originalLanguages}
          isEditing={true}
          onSongNameChange={setSongName}
          onArtistNameChange={setArtistName}
          onLanguagesChange={setOriginalLanguages}
          showLanguageSelect={true}
        />
      )}
      {!currentLyrics && (
        <View style={styles.searchButtonRow}>
          <TouchableOpacity
            style={[styles.searchButton, searchDisabled && styles.disabled]}
            disabled={searchDisabled}
            onPress={handleGoogleSearch}
          >
            <Ionicons name="search" size={18} color={Colors.white} />
            <Text style={styles.searchButtonText}>Google Search</Text>
          </TouchableOpacity>
          {activeTab > 0 && originalLyrics && (
            <TouchableOpacity
              style={[styles.searchButton, styles.deeplButton]}
              onPress={handleGetTranslation}
            >
              <Ionicons name="language" size={18} color={Colors.white} />
              <Text style={styles.searchButtonText}>Get Translation</Text>
            </TouchableOpacity>
          )}
        </View>
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
              // Disable side-by-side mode when switching to original tab
              setIsShowingOriginal(false);
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
              <Text style={[
                styles.tabText,
                activeTab === i + 1 && styles.tabTextActive
              ]}>
                {t.language}
              </Text>
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
      {(translations.length > 0 && activeTab > 0 || currentLyrics.length > 0) && (
        <View style={styles.togglesRow}>
          {translations.length > 0 && activeTab > 0 && (
            <TouchableOpacity
              style={[styles.toggle, isShowingOriginal && styles.toggleActive]}
              onPress={() => setIsShowingOriginal(!isShowingOriginal)}
            >
              <Ionicons name="language-outline" size={18} color={isShowingOriginal ? Colors.white : Colors.primary} />
              <Text style={[styles.toggleText, isShowingOriginal && styles.toggleTextActive]}>
                Show Original
              </Text>
            </TouchableOpacity>
          )}
          
        </View>
      )}
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

  const bilingualReferenceLines = isShowingOriginal && activeTab > 0
    ? originalLyrics.split('\n')
    : undefined;

  const lyricsPanel = (
    <View style={[styles.lyricsContainer, isWide && styles.lyricsContainerWide]}>
      <View style={styles.lyricsInputWrapper}>
        <LyricsEditor
          lyrics={currentLyrics}
          onLyricsChange={setCurrentLyrics}
          showLineNumbers={true}
          referenceLines={bilingualReferenceLines}
          onFocus={() => setIsEditingMetadata(false)}
        />
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

      {/* FAB for matched songs */}
      {!isEditMode && matchedSongsSearchQuery && matchedSongsCount > 0 && (
        <FabBubble
          icon="musical-notes"
          text={matchedSongsCount === 1 ? 'Already Saved!' : `Found ${matchedSongsCount} songs`}
          onPress={handleMatchedSongsFabPress}
          right={40}
          bottom={0}
          tailPosition="right"
          tailOffset={20}
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 1,
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
  titleReplacement: {
    flex: 1,
    marginHorizontal: 8,
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
  searchButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  searchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  deeplButton: {
    backgroundColor: Colors.success,
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
  togglesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 6,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: Colors.white,
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
