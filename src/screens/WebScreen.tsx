import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, useWindowDimensions, BackHandler, ToastAndroid, Platform, Image } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { WebView } from '../components/WebView';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Colors } from '../constants/theme';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SIDE_NAV_WIDTH, WIDE_BREAKPOINT } from '../hooks/useLayout';
import { cleanGeniusLyrics } from '../utils/cleanLyrics';
import { getFaviconUrl } from '../utils/getFaviconUrl';
import { scrapeLyricsJS } from '../utils/scrapeLyricsJS';
import { detectLyricsJS } from '../utils/detectLyricsJS';
import { detectTranslationJS } from '../utils/detectTranslationJS';
import { scrapeTranslationJS } from '../utils/scrapeTranslationJS';
import { pasteIntoDeepLJS } from '../utils/pasteIntoDeepLJS';
import { remapTranslation } from '../utils/deeplTranslation';
import Toast from '../components/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FabBubble from '../components/FabBubble';


export default function WebScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { webUrl, setWebUrl, scrapeTargetTab, deeplLineMap, setDeeplLineMap } = useStore();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState(webUrl);
  const [addressText, setAddressText] = useState(webUrl);
  const [pageTitle, setPageTitle] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showFab, setShowFab] = useState(false);
  const [showTranslationFab, setShowTranslationFab] = useState(false);
  const [waitingForTranslation, setWaitingForTranslation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const backPressedOnce = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const [webViewKey, setWebViewKey] = useState(0);
  const pendingPasteText = useRef<string | null>(null);

  const injectDetectionScripts = (url: string) => {
    injectLyricsDetectedScript();
    injectDeepLScripts(url);
  };

  const injectLyricsDetectedScript = () => {
    webViewRef.current?.injectJavaScript(detectLyricsJS);
  }

  const injectDeepLScripts = (url: string) => {
    if (!url.includes('deepl.com')) return;
    
    pasteIntoDeepL();
    detectDeepLTranslationResult();
  }

  const pasteIntoDeepL = () => {
    if (!pendingPasteText.current) return;

    webViewRef.current?.injectJavaScript(pasteIntoDeepLJS(pendingPasteText.current));
    pendingPasteText.current = null;
    setShowTranslationFab(true);
    setWaitingForTranslation(true);
  }
  
  const detectDeepLTranslationResult = () => {
    webViewRef.current?.injectJavaScript(detectTranslationJS);
  }

  const handleNavigate = () => {
    let url = addressText.trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    if (url) {
      setAddressText(url);
      setWebUrl(url);
    }
  };

  const handleScrapeLyrics = () => {
    webViewRef.current?.injectJavaScript(scrapeLyricsJS);
  };

  const handleScrapeTranslation = () => {
    webViewRef.current?.injectJavaScript(scrapeTranslationJS);
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'debug') {
        console.log('[WebView]', typeof data.log === 'object' ? JSON.stringify(data.log) : data.log);
        return;
      }
      if (data.type === 'lyricsDetected') {
        setShowFab(data.hasLyrics === true);
        return;
      }
      if (data.type === 'translationDetected') {
        setWaitingForTranslation(!data.hasTranslation);
        return;
      }
      if (data.type === 'lyrics' && data.text) {
        let lyrics = data.text.trim();
        if (currentUrl.includes('genius.com')) {
          lyrics = cleanGeniusLyrics(lyrics);
        }
        navigation.navigate('Editor', {
          scrapedLyrics: lyrics,
          scrapedSourceUrl: currentUrl,
          scrapedPageTitle: data.title ?? '',
          scrapedTargetTab: scrapeTargetTab,
          scrapedLanguageCode: data.languageCode || ''
        });
      }
      if (data.type === 'translation' && data.text) {
        let translation = data.text.trim();
        // Remap translation using the line map if available
        if (deeplLineMap) {
          translation = remapTranslation(translation, deeplLineMap);
          setDeeplLineMap(null); // Clear the line map after use
        }
        navigation.navigate('Editor', { scrapedLyrics: translation, scrapedSourceUrl: currentUrl, scrapedPageTitle: data.title ?? '', scrapedTargetTab: scrapeTargetTab });
      }
      if (data.type === 'error') {
        setToast(data.message || 'Failed to scrape lyrics');
      }
    } catch (e) {
      // ignore parse errors
    }
  };

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        // Go back in WebView history
        webViewRef.current.goBack();
        return true; // Prevent default behavior
      }

      // No history - show "back to quit" behavior
      if (backPressedOnce.current) {
        // Second press - allow default behavior (exit app)
        return false;
      }

      // First press - show toast and prevent exit
      backPressedOnce.current = true;
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);

      // Reset after 2 seconds
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        backPressedOnce.current = false;
      }, 2000) as unknown as number;

      return true; // Prevent default behavior
    });

    return () => {
      backHandler.remove();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [canGoBack]);

  // Handle pasting into DeepL
  useEffect(() => {
    const pasteText = route.params?.pasteIntoDeepL as string | undefined;
    if (pasteText) {
      // Store the text to paste, will be injected after page loads
      pendingPasteText.current = pasteText;
      navigation.setParams({ pasteIntoDeepL: undefined });
    }
  }, [route.params?.pasteIntoDeepL]);

  // Force WebView to reload when URL changes, even if it's the same URL
  useEffect(() => {
    setWebViewKey((prev) => prev + 1);
  }, [webUrl]);

  return (
    <View style={[styles.container, isWide && { paddingLeft: SIDE_NAV_WIDTH }]}>
      <View style={[styles.addressBar, { paddingTop: insets.top || 6 }]}>
        {showUrlInput ? (
          <>
            <TextInput
              style={styles.addressInput}
              value={addressText}
              onChangeText={setAddressText}
              onSubmitEditing={() => { handleNavigate(); setShowUrlInput(false); }}
              onBlur={() => setShowUrlInput(false)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              selectTextOnFocus
              autoFocus
              placeholderTextColor={Colors.textMuted}
              placeholder="Enter URL"
            />
            <TouchableOpacity onPress={() => { handleNavigate(); setShowUrlInput(false); }} style={styles.goButton}>
              <Ionicons name="arrow-forward-circle" size={28} color={Colors.primary} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            {canGoBack && (
              <TouchableOpacity onPress={() => webViewRef.current?.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={22} color={Colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.titleButton} onPress={() => setShowUrlInput(true)}>
              {getFaviconUrl(currentUrl) && (
                <Image source={{ uri: getFaviconUrl(currentUrl)! }} style={styles.favicon} />
              )}
              <Text style={styles.titleText} numberOfLines={1}>{pageTitle || addressText}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      <WebView
        key={webViewKey}
        ref={webViewRef}
        source={{ uri: webUrl }}
        style={styles.webview}
        onNavigationStateChange={(navState) => {
          setCurrentUrl(navState.url);
          setAddressText(navState.url);
          setPageTitle(navState.title ?? '');
          setShowUrlInput(false);
          setCanGoBack(navState.canGoBack);
          setLoading(navState.loading);
          if (navState.url !== webUrl) {
            setShowTranslationFab(false);
          }
          if (!navState.loading) {
            injectDetectionScripts(navState.url);
          }
        }}
        onLoadStart={() => {
          setLoading(true);
          setShowFab(false);
        }}
        onLoadEnd={() => {
          setLoading(false);
          injectDetectionScripts(webUrl);
        }}
        onMessage={handleMessage}
        javaScriptEnabled
      />
      {loading && (
        <View accessibilityLabel="Loading Overlay" style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {!!toast && <Toast message={toast ?? ''} />}

      {showFab && (
        <FabBubble
          icon="download-outline"
          text="Get Lyrics"
          onPress={handleScrapeLyrics}
          tailPosition="left"
          left={10}
          bottom={0}
        />
      )}

      {showTranslationFab && (
        <FabBubble
          icon="download-outline"
          text={waitingForTranslation ? "Waiting for Translation..." : "Get Translation"}
          onPress={handleScrapeTranslation}
          tailPosition="left"
          left={10}
          bottom={0}
          color={Colors.success}
          disabled={waitingForTranslation}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  backButton: {
    paddingRight: 8,
  },
  titleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    gap: 8,
  },
  favicon: {
    width: 16,
    height: 16,
    borderRadius: 2,
  },
  titleText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  addressInput: {
    flex: 1,
    backgroundColor: Colors.background,
    color: Colors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  goButton: {
    paddingLeft: 8,
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
