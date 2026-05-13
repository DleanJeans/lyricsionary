import React, { useRef, useState, useEffect } from 'react';
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
import { RootTabParamList } from '../types';
import { getFaviconUrl } from '../utils/getFaviconUrl';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LanguageSelect from '../components/LanguageSelect';
import EmojiSelect from '../components/EmojiSelect';

type WordLookupRouteProp = RouteProp<RootTabParamList, 'WordLookup'>;

export default function WordLookupScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<WordLookupRouteProp>();
  const { word, songId, songName, artistName, lyricsLine } = route.params || {};
  const insets = useSafeAreaInsets();

  const { words, addOrUpdateWord } = useStore();
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
  const [lookupSource, setLookupSource] = useState<'google' | 'wiktionary'>('google');

  // Word data fields
  const [language, setLanguage] = useState('English');
  const [pronunciation, setPronunciation] = useState('');
  const [definition, setDefinition] = useState('');
  const [emoji, setEmoji] = useState('');

  // Load existing word data if available
  useEffect(() => {
    if (word) {
      const existingWord = words.find(
        (w) => w.word.toLowerCase() === word.toLowerCase()
      );
      if (existingWord) {
        setLanguage(existingWord.language);
        setPronunciation(existingWord.pronunciation);
        setEmoji(existingWord.emoji || '');
        // Load the most recent definition or one matching this song
        const relevantDef = existingWord.definitions.find(d => d.songId === songId)
          || existingWord.definitions[0];
        if (relevantDef) {
          setDefinition(relevantDef.text);
        }
      }
    }
  }, [word, words, songId]);

  // Set initial URL based on lookup source
  useEffect(() => {
    if (word) {
      const url = lookupSource === 'google'
        ? `https://www.google.com/search?igu=1&q=define+${encodeURIComponent(word)}`
        : `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`;
      setCurrentUrl(url);
      setWebViewAtTop(true); // reset on navigation
    }
  }, [word, lookupSource]);

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBackInWebView && webViewRef.current) {
        // Go back in WebView history
        webViewRef.current.goBack();
        return true; // Prevent default behavior
      }

      // No WebView history - go back to previous screen
      navigation.goBack();
      return true; // Prevent default behavior
    });

    return () => {
      backHandler.remove();
    };
  }, [canGoBackInWebView, navigation]);

  const handleSave = async () => {
    if (!word) return;

    // Update word with new data
    await addOrUpdateWord(word, language, pronunciation, definition, songId, songName, lyricsLine, emoji);

    // Navigate back to Learn screen
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
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

  // Render context line with underlined word
  const renderContextLine = () => {
    if (!lyricsLine || !word) return null;

    const cleanWord = word.replace(/[^\p{L}\p{N}'-]/gu, '').toLowerCase();
    const parts = lyricsLine.split(new RegExp(`(\\b${cleanWord}\\b)`, 'gi'));

    return (
      <Text style={styles.contextLine}>
        "
        {parts.map((part, index) => {
          if (part.toLowerCase() === cleanWord) {
            return (
              <Text key={index} style={styles.contextLineUnderlined}>
                {part}
              </Text>
            );
          }
          return part;
        })}
        "
      </Text>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{word}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        onScroll={handleOuterScroll}
        scrollEventThrottle={20}
      >
        {/* Context Info */}
        {songName && (
          <View style={styles.contextSection}>
            <Text style={styles.contextLabel}>Context</Text>
            <Text style={styles.contextSong}>{songName} - {artistName}</Text>
            {lyricsLine && renderContextLine()}
          </View>
        )}

        {/* Word Info Fields */}
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
            <Text style={styles.fieldLabel}>Emoji</Text>
            <EmojiSelect
              value={emoji}
              onValueChange={setEmoji}
              placeholder="Select emoji (optional)"
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
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Definition</Text>
            <TextInput
              style={[styles.fieldInput, styles.definitionInput]}
              value={definition}
              onChangeText={setDefinition}
              placeholder="Add definition or meaning"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Source Selector */}
        <View style={styles.sourceSelector}>
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
        </View>

        {/* WebView Section */}
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
                }}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
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
      </ScrollView>
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
  contextSong: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  contextLine: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  contextLineUnderlined: {
    textDecorationLine: 'underline',
    fontWeight: '600',
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
  definitionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
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
    height: 500,
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
});
