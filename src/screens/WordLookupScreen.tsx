import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  BackHandler,
} from 'react-native';
import { WebView } from '../components/WebView';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Colors } from '../constants/theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootTabParamList, MasteryLevel, WordContext } from '../types';
import { getFaviconUrl } from '../utils/getFaviconUrl';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LanguageSelect from '../components/LanguageSelect';
import EmojiPicker, { type EmojiType } from 'rn-emoji-keyboard';
import { removeSpecialChars } from '../utils/cleanLyrics';
import { getScrapeIpaJS } from '../utils/scrapeIpaJS';
import WordTransformButtons from '../components/WordTransformButtons';
import WordSenseCard from '../components/WordSenseCard';
import SongContextBlock from '../components/SongContextBlock';
import ConfirmDialog from '../components/ConfirmDialog';

type WordLookupRouteProp = RouteProp<RootTabParamList, 'WordLookup'>;

interface WordSensemData {
  context: string;
  emoji: string;
  ipa: string;
  definition: string;
  songId?: string;
  songName?: string;
  translation?: string;
  fromSong?: boolean;
  occurrence?: number;
}

export default function WordLookupScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<WordLookupRouteProp>();
  const { word, songId, songName, artistName, lyricsLine, translationLine, originalLanguages, source, occurrence: routeOccurrence } = route.params || {};
  const insets = useSafeAreaInsets();

  const { words, addOrUpdateWord, deleteWord } = useStore();
  const webViewRef = useRef<WebView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [canGoBackInWebView, setCanGoBackInWebView] = useState(false);
  const [webViewAtTop, setWebViewAtTop] = useState(true);
  const [scrollingUp, setScrollingUp] = useState(false);
  const [scrollViewAtBottom, setScrollViewAtBottom] = useState(false);

  const webViewScrollDisabled = webViewAtTop && scrollingUp;
  const webViewScrollEnabled = scrollViewAtBottom && !webViewScrollDisabled;

  const injectedJavaScript = `
    (function() {
      var atTop = true;
      var scrollingUp = false;
      var lastY = 0;
      window.addEventListener('scroll', function() {
        var currentY = window.scrollY || window.pageYOffset || 0;
        var nowAtTop = currentY === 0;
        var nowScrollingUp = currentY < lastY;
        lastY = currentY;

        atTop = nowAtTop;
        scrollingUp = nowScrollingUp;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'webviewScroll', atTop, scrollingUp }));
      }, { passive: true });
    })();
    true;
  `;

  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'webviewScroll') {
        setWebViewAtTop(data.atTop);
        setScrollingUp(data.scrollingUp);
      } else if (data.type === 'ipa' && data.results) {
        setScrapedIpaResults(data.results);
      } else if (data.type === 'ipaError') {
        console.log('IPA scraping error:', data.message);
      }
    } catch {}
  };

  const handleOuterScroll = (event: { nativeEvent: { layoutMeasurement: { height: number }; contentOffset: { y: number }; contentSize: { height: number } } }) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    setScrollViewAtBottom(layoutMeasurement.height + contentOffset.y >= contentSize.height - 20);
    setScrollingUp(false);
  };

  const [currentUrl, setCurrentUrl] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupSource, setLookupSource] = useState<'google' | 'wiktionary'>('wiktionary');

  const [language, setLanguage] = useState(
    (originalLanguages && originalLanguages.length > 0) ? originalLanguages[0] : 'English'
  );
  const [pronunciation, setPronunciation] = useState('');
  const [masteryLevel, setMasteryLevel] = useState<MasteryLevel>('New');
  const [scrapedIpaResults, setScrapedIpaResults] = useState<string[]>([]);

  const [wordSenses, setWordSenses] = useState<WordSensemData[]>([
    { context: lyricsLine || '', emoji: '', ipa: '', definition: '', songId, songName, occurrence: routeOccurrence || 1 }
  ]);
  const [emojiPickerIndex, setEmojiPickerIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [undoData, setUndoData] = useState<{ block: WordSensemData; index: number } | null>(null);

  const initialDataRef = useRef<{
    language: string;
    pronunciation: string;
    masteryLevel: MasteryLevel;
    wordSenses: WordSensemData[];
  } | null>(null);

  const [displayWord, setDisplayWord] = useState(word);

  useEffect(() => {
    setDisplayWord(word);
  }, [word]);

  useEffect(() => {
    if (displayWord) {
      const existingWord = words.find(
        (w) => w.word.toLowerCase() === displayWord.toLowerCase()
      );
      if (existingWord) {
        setLanguage(existingWord.language);
        setPronunciation(existingWord.pronunciation);
        setMasteryLevel(existingWord.masteryLevel || 'New');

        if (existingWord.contexts && existingWord.contexts.length > 0) {
          const exactMatchIndex = existingWord.contexts.findIndex(c =>
            c.songId === songId && c.context === lyricsLine && (c.occurrence || 1) === (routeOccurrence || 1)
          );
          const hasNewContextFromLearn = source === 'Learn' && lyricsLine && exactMatchIndex < 0;

          const mapContext = (c: WordContext): WordSensemData => ({
            context: c.context,
            emoji: c.emoji || '',
            ipa: c.ipa || '',
            definition: c.definition || '',
            songId: c.songId,
            songName: c.songName,
            occurrence: c.occurrence || 1,
            fromSong: c.fromSong ?? false,
          });

          if (exactMatchIndex >= 0) {
            const first = mapContext(existingWord.contexts[exactMatchIndex]);
            const rest = existingWord.contexts.filter((_, i) => i !== exactMatchIndex).map(mapContext);
            setWordSenses([first, ...rest]);
          } else if (hasNewContextFromLearn) {
            const newBlock: WordSensemData = {
              context: lyricsLine,
              emoji: '',
              ipa: '',
              definition: '',
              songId,
              songName,
              translation: translationLine,
              fromSong: true,
              occurrence: routeOccurrence || 1,
            };
            const existingBlocks = existingWord.contexts.map(mapContext);
            setWordSenses([newBlock, ...existingBlocks]);
          } else {
            const existingBlocks = existingWord.contexts.map(mapContext);
            setWordSenses(existingBlocks);
          }
        } else {
          setWordSenses([{ context: lyricsLine || '', emoji: '', ipa: '', definition: '', songId, songName, translation: translationLine, fromSong: !!(source === 'Learn' && lyricsLine), occurrence: routeOccurrence || 1 }]);
        }
      } else {
        setPronunciation('');
        setMasteryLevel('New');
        setWordSenses([{ context: lyricsLine || '', emoji: '', ipa: '', definition: '', songId, songName, translation: translationLine, fromSong: !!(source === 'Learn' && lyricsLine), occurrence: routeOccurrence || 1 }]);
        if (originalLanguages && originalLanguages.length > 0) {
          setLanguage(originalLanguages[0]);
        } else {
          setLanguage('English');
        }
      }
    }
  }, [displayWord, words, songId, lyricsLine, originalLanguages, routeOccurrence, source]);

  const isNewWord = displayWord && !words.find((w) => w.word.toLowerCase() === displayWord.toLowerCase());

  const hasChanges = useMemo(() => {
    if (!displayWord) return false;
    if (isNewWord) return true;
    const existing = words.find((w) => w.word.toLowerCase() === displayWord.toLowerCase());
    if (!existing) return true;
    if (language !== existing.language) return true;
    if (pronunciation !== existing.pronunciation) return true;
    if (masteryLevel !== (existing.masteryLevel || 'New')) return true;
    const normalizeSense = (s: any) => `${s.context || ''}|${s.emoji || ''}|${s.ipa || ''}|${s.definition || ''}|${s.songId || ''}|${s.occurrence || 1}`;
    const currentNormalized = wordSenses
      .filter(b => b.context || b.emoji || b.ipa || b.definition)
      .map(normalizeSense)
      .sort()
      .join('||');
    const storedNormalized = (existing.contexts || [])
      .map(normalizeSense)
      .sort()
      .join('||');
    return currentNormalized !== storedNormalized;
  }, [displayWord, isNewWord, language, pronunciation, masteryLevel, wordSenses, words]);

  useEffect(() => {
    if (displayWord) {
      const url = lookupSource === 'google'
        ? `https://www.google.com/search?igu=1&q=define+${encodeURIComponent(displayWord)}`
        : `https://en.wiktionary.org/wiki/${encodeURIComponent(displayWord)}#${language}`;
      setCurrentUrl(url);
      setWebViewAtTop(true);
      setScrapedIpaResults([]);
    }
  }, [displayWord, lookupSource]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBackInWebView && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }

      if (source === 'Words') {
        navigation.navigate('Words');
      } else if (source === 'Learn' && songId) {
        navigation.navigate('Learn', { songId });
      } else {
        navigation.goBack();
      }
      return true;
    });

    return () => {
      backHandler.remove();
    };
  }, [canGoBackInWebView, navigation, source, songId]);

  const updateWordSense = (index: number, field: keyof WordSensemData, value: string | number) => {
    setUndoData(null);
    setWordSenses(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
  };

  const addWordSense = () => {
    setUndoData(null);
    setWordSenses(prev => [...prev, { context: '', emoji: '', ipa: '', definition: '', songId, songName, occurrence: 1 }]);
  };

  const removeWordSense = (index: number) => {
    setUndoData({ block: wordSenses[index], index });
    setWordSenses(prev => prev.filter((_, i) => i !== index));
  };

  const undoRemoveWordSense = () => {
    if (undoData) {
      setWordSenses(prev => {
        const newBlocks = [...prev];
        newBlocks.splice(undoData.index, 0, undoData.block);
        return newBlocks;
      });
      setUndoData(null);
    }
  };

  const handleSave = async () => {
    if (!displayWord) return;

    const contexts: WordContext[] = wordSenses
      .filter(b => b.context || b.emoji || b.ipa || b.definition)
      .map(b => ({
        context: b.context,
        emoji: b.emoji || undefined,
        ipa: b.ipa || undefined,
        definition: b.definition || undefined,
        songId: b.songId,
        songName: b.songName,
        fromSong: b.fromSong ?? false,
        occurrence: b.occurrence || 1,
      }));

    await addOrUpdateWord(
      displayWord, language, pronunciation, contexts, masteryLevel
    );

    if (source === 'Words') {
      navigation.navigate('Words');
    } else if (source === 'Learn' && songId) {
      navigation.navigate('Learn', { songId });
    } else {
      navigation.goBack();
    }
  };

  const handleCancel = () => {
    if (source === 'Words') {
      navigation.navigate('Words');
    } else if (source === 'Learn' && songId) {
      navigation.navigate('Learn', { songId });
    } else {
      navigation.goBack();
    }
  };

  const handleDelete = async () => {
    const existing = words.find(w => w.word.toLowerCase() === displayWord?.toLowerCase());
    if (existing) {
      await deleteWord(existing.id);
    }
    handleCancel();
  };

  const switchToGoogle = () => {
    setLookupSource('google');
  };

  const switchToWiktionary = () => {
    setLookupSource('wiktionary');
  };

  const handleWebViewGoBack = () => {
    if (canGoBackInWebView && webViewRef.current) {
      webViewRef.current.goBack();
    }
  };

  const cleanWordForContext = word ? removeSpecialChars(word) : undefined;

  const ipaPlaceholder = pronunciation
    ? (pronunciation.includes('/') ? pronunciation : `/${pronunciation}/`)
    : 'e.g., /prəˌnʌnsiˈeɪʃən/';

  const existingWord = words.find(w => w.word.toLowerCase() === displayWord?.toLowerCase());

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{displayWord}</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, isNewWord && { backgroundColor: Colors.success }, !hasChanges && !isNewWord && styles.saveButtonDisabled]}
          disabled={!hasChanges && !isNewWord}
        >
          <Text style={[styles.saveButtonText, !hasChanges && !isNewWord && styles.saveButtonTextDisabled]}>{isNewWord ? 'Add' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        onScroll={handleOuterScroll}
        scrollEventThrottle={20}
      >
        {songName && (
          <View style={styles.contextSection}>
            <Text style={styles.contextLabel}>Context</Text>
            <SongContextBlock
              context={lyricsLine || ''}
              word={cleanWordForContext}
              songName={songName}
              artistName={artistName}
              translation={translationLine}
            />
          </View>
        )}

        {word && (
          <View style={styles.wordTransformButtons}>
            <WordTransformButtons
              word={word}
              language={language}
              songId={songId}
              songName={songName}
              artistName={artistName}
              lyricsLine={lyricsLine}
              translationLine={translationLine}
              originalLanguages={originalLanguages}
              source={source}
              occurrence={routeOccurrence}
              hideOriginalWord
            />
          </View>
        )}

        <View style={styles.fieldSection}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Language</Text>
            <LanguageSelect
              value={language}
              onValueChange={setLanguage}
              placeholder="Select language"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Pronunciation</Text>
            <TextInput
              style={styles.fieldInput}
              value={pronunciation}
              onChangeText={setPronunciation}
              placeholder="e.g., /prəˌnʌnsiˈeɪʃən/"
              placeholderTextColor={Colors.textMuted}
            />
            {lookupSource === 'wiktionary' && scrapedIpaResults.length > 0 && (
              <View style={styles.ipaResultsRow}>
                {scrapedIpaResults.filter(ipa => ipa && !pronunciation.includes(ipa)).map((ipa, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.ipaResultButton}
                    onPress={() => setPronunciation(ipa)}
                  >
                    <Text style={styles.ipaResultButtonText}>{ipa}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Level</Text>
            <View style={styles.masteryLevelSelector}>
              <TouchableOpacity
                style={[
                  styles.masteryLevelButton,
                  masteryLevel === 'New' && styles.masteryLevelButtonActive,
                  masteryLevel === 'New' && { backgroundColor: Colors.masteryNew }
                ]}
                onPress={() => setMasteryLevel('New')}
              >
                <Text style={[
                  styles.masteryLevelButtonText,
                  masteryLevel === 'New' && styles.masteryLevelButtonTextActive
                ]}>New</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.masteryLevelButton,
                  masteryLevel === 'Learning' && styles.masteryLevelButtonActive,
                  masteryLevel === 'Learning' && { backgroundColor: Colors.masteryLearning }
                ]}
                onPress={() => setMasteryLevel('Learning')}
              >
                <Text style={[
                  styles.masteryLevelButtonText,
                  masteryLevel === 'Learning' && styles.masteryLevelButtonTextActive
                ]}>Learning</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.masteryLevelButton,
                  masteryLevel === 'Mastered' && styles.masteryLevelButtonActive,
                  masteryLevel === 'Mastered' && { backgroundColor: Colors.masteryMastered }
                ]}
                onPress={() => setMasteryLevel('Mastered')}
              >
                <Text style={[
                  styles.masteryLevelButtonText,
                  masteryLevel === 'Mastered' && styles.masteryLevelButtonTextActive
                ]}>Mastered</Text>
              </TouchableOpacity>
            </View>
          </View>

          {wordSenses.map((block, index) => (
            <View key={index} style={styles.wordSenseWrapper}>
              {wordSenses.length > 1 && index > 0 && (
                <View style={styles.contextDivider} />
              )}
              <WordSenseCard
                context={block.context}
                onContextChange={(v) => updateWordSense(index, 'context', v)}
                emoji={block.emoji}
                onEmojiPress={() => setEmojiPickerIndex(index)}
                ipa={block.ipa}
                onIpaChange={(v) => updateWordSense(index, 'ipa', v)}
                ipaPlaceholder={ipaPlaceholder}
                definition={block.definition}
                onDefinitionChange={(v) => updateWordSense(index, 'definition', v)}
                onRemove={wordSenses.length > 1 ? () => removeWordSense(index) : undefined}
                word={displayWord}
                occurrence={block.occurrence}
                onOccurrenceChange={(v) => updateWordSense(index, 'occurrence', v)}
                translation={block.translation}
                fromSong={block.fromSong}
                songName={songName}
                artistName={artistName}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.addContextButton} onPress={addWordSense}>
            <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
            <Text style={styles.addContextButtonText}>Add context</Text>
          </TouchableOpacity>

          {undoData && (
            <TouchableOpacity style={styles.undoButton} onPress={undoRemoveWordSense}>
              <Ionicons name="arrow-undo-outline" size={18} color={Colors.primary} />
              <Text style={styles.undoButtonText}>Undo remove</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sourceSelector}>
          <TouchableOpacity
            style={[styles.sourceButton, lookupSource === 'wiktionary' && styles.sourceButtonActive]}
            onPress={switchToWiktionary}
          >
            <Ionicons
              name="book-outline"
              size={18}
              color={lookupSource === 'wiktionary' ? Colors.white : Colors.text}
            />
            <Text style={[
              styles.sourceButtonText,
              lookupSource === 'wiktionary' && styles.sourceButtonTextActive
            ]}>
              Wiktionary
            </Text>
          </TouchableOpacity>

        <TouchableOpacity
            style={[styles.sourceButton, lookupSource === 'google' && styles.sourceButtonActive]}
            onPress={switchToGoogle}
          >
            <Ionicons
              name="logo-google"
              size={18}
              color={lookupSource === 'google' ? Colors.white : Colors.text}
            />
            <Text style={[
              styles.sourceButtonText,
              lookupSource === 'google' && styles.sourceButtonTextActive
            ]}>
              Google
            </Text>
          </TouchableOpacity>
        </View>


        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            {canGoBackInWebView && (
              <TouchableOpacity onPress={handleWebViewGoBack} style={styles.webViewBackButton}>
                <Ionicons name="arrow-back" size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
            {getFaviconUrl(currentUrl) && (
              <Image
                source={{ uri: getFaviconUrl(currentUrl)! }}
                style={styles.favicon}
              />
            )}
            <Text style={styles.webViewTitle} numberOfLines={1}>
              {pageTitle || currentUrl}
            </Text>
          </View>

          <View style={styles.webViewWrapper}>
            {currentUrl ? (
              <WebView
                ref={webViewRef}
                source={{ uri: currentUrl }}
                style={styles.webview}
                onNavigationStateChange={(navState) => {
                  setPageTitle(navState.title ?? '');
                  setCanGoBackInWebView(navState.canGoBack);

                  if (lookupSource === 'wiktionary' && navState.url && webViewRef.current) {
                    const url = navState.url;
                    const isWiktionary = url.includes('wiktionary.org/wiki/');
                    const hasLanguageAnchor = url.includes('#');

                    if (isWiktionary && !hasLanguageAnchor && language) {
                      const newUrl = `${url}#${language}`;
                      setCurrentUrl(newUrl);
                    }
                  }
                }}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => {
                  setLoading(false);
                  if (lookupSource === 'wiktionary' && webViewRef.current) {
                    webViewRef.current.injectJavaScript(getScrapeIpaJS(language));
                  }
                }}
                javaScriptEnabled
                nestedScrollEnabled={webViewScrollEnabled}
                injectedJavaScript={injectedJavaScript}
                onMessage={handleWebViewMessage}
              />
            ) : null}
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            )}
          </View>
        </View>

        {existingWord && (
          <TouchableOpacity style={styles.deleteButton} onPress={() => setShowDeleteConfirm(true)}>
            <Ionicons name="trash-outline" size={20} color={Colors.danger} />
            <Text style={styles.deleteButtonText}>Delete word</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <EmojiPicker
        onEmojiSelected={(emojiObject: EmojiType) => {
          if (emojiPickerIndex !== null) {
            updateWordSense(emojiPickerIndex, 'emoji', emojiObject.emoji);
          }
        }}
        open={emojiPickerIndex !== null}
        onClose={() => setEmojiPickerIndex(null)}
        enableSearchBar={true}
        theme={{
          backdrop: 'rgba(0, 0, 0, 0.6)',
          knob: Colors.textMuted,
          container: Colors.surface,
          header: Colors.text,
          skinTonesContainer: Colors.surfaceLight,
          category: {
            icon: Colors.textSecondary,
            iconActive: Colors.primary,
            container: Colors.surface,
            containerActive: Colors.surfaceLight,
          },
          search: {
            background: Colors.surfaceLight,
            text: Colors.text,
            placeholder: Colors.textMuted,
            icon: Colors.textSecondary,
          },
          emoji: {
            selected: Colors.primary,
          },
        }}
      />
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Word"
        message={`Are you sure you want to delete "${displayWord}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        destructive
      />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonTextDisabled: {
    opacity: 0.4,
  },
  content: {
    flex: 1,
  },
  contextSection: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  contextLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  
  wordTransformButtons: {
    marginLeft: 16,
  },
  fieldSection: {
    padding: 16,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  fieldInput: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ipaResultsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  ipaResultButton: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ipaResultButtonText: {
    color: Colors.text,
    fontSize: 14,
  },
  wordSenseWrapper: {
    gap: 0,
  },
  contextDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  addContextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  addContextButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  undoButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  deleteButtonText: {
    color: Colors.danger,
    fontSize: 15,
    fontWeight: '600',
  },
  sourceSelector: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sourceButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sourceButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  sourceButtonTextActive: {
    color: Colors.white,
  },
  webViewContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  webViewBackButton: {
    padding: 4,
  },
  favicon: {
    width: 16,
    height: 16,
    borderRadius: 2,
  },
  webViewTitle: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  webViewWrapper: {
    height: 525,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  masteryLevelSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  masteryLevelButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  masteryLevelButtonActive: {
    borderColor: 'transparent',
  },
  masteryLevelButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  masteryLevelButtonTextActive: {
    color: Colors.background,
  },
});