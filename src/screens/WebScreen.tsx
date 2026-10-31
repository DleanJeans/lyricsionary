import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Platform,
  StyleSheet,
  ToastAndroid,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FabBubble from '../components/FabBubble';
import { Text, TextInput } from '../components/Text';
import Toast from '../components/Toast';
import { WebView } from '../components/WebView';
import { Colors } from '../constants/theme';
import { isMostlyLatin, isRomanized } from '../constants/languages';
import { SIDE_NAV_WIDTH, WIDE_BREAKPOINT } from '../hooks/useLayout';
import { useStore } from '../store/useStore';
import { cleanGeniusLyrics } from '../utils/cleanLyrics';
import { joinChunks, remapTranslation } from '../utils/deeplTranslation';
import { detectLyricsJS } from '../utils/detectLyricsJS';
import { detectTranslationJS } from '../utils/detectTranslationJS';
import { followLyricsLinkJS } from '../utils/followLyricsLinkJS';
import { GeniusVersion, mergeGeniusVersions, splitGeniusVersions, translationLanguageOf } from '../utils/geniusVersions';
import { getFaviconUrl } from '../utils/getFaviconUrl';
import { pasteIntoDeepLJS } from '../utils/pasteIntoDeepLJS';
import { scrapeLyricsJS } from '../utils/scrapeLyricsJS';
import { scrapeTranslationJS } from '../utils/scrapeTranslationJS';

export default function WebScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const webUrl = useStore((s) => s.webUrl);
  const setWebUrl = useStore((s) => s.setWebUrl);
  const scrapeTargetTab = useStore((s) => s.scrapeTargetTab);
  const scrapeTargetLanguage = useStore((s) => s.scrapeTargetLanguage);
  const deeplLineMap = useStore((s) => s.deeplLineMap);
  const deeplChunks = useStore((s) => s.deeplChunks);
  const deeplCurrentChunk = useStore((s) => s.deeplCurrentChunk);
  const deeplTranslatedChunks = useStore((s) => s.deeplTranslatedChunks);
  const setDeeplCurrentChunk = useStore((s) => s.setDeeplCurrentChunk);
  const addDeeplTranslatedChunk = useStore((s) => s.addDeeplTranslatedChunk);
  const resetDeeplTranslation = useStore((s) => s.resetDeeplTranslation);
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
  const previousWaitingForTranslation = useRef<boolean>(false);
  // Pages already scraped or followed automatically, so repeated detection messages act once
  const autoScrapedUrl = useRef<string | null>(null);
  const autoFollowedUrl = useRef<string | null>(null);
  // A Genius song's versions while some still need their page opened, e.g. to get past the captcha
  const geniusImport = useRef<GeniusVersion[] | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const injectDetectionScripts = (url: string) => {
    injectLyricsDetectedScript();
    injectDeepLScripts(url);
  };

  const injectLyricsDetectedScript = () => {
    webViewRef.current?.injectJavaScript(detectLyricsJS);
  };

  const injectDeepLScripts = (url: string) => {
    if (!url.includes('deepl.com')) return;

    pasteIntoDeepL();
    detectDeepLTranslationResult();
  };

  const pasteIntoDeepL = () => {
    if (!pendingPasteText.current) return;

    webViewRef.current?.injectJavaScript(pasteIntoDeepLJS(pendingPasteText.current));
    pendingPasteText.current = null;
    setShowTranslationFab(true);
    setWaitingForTranslation(true);
  };

  const detectDeepLTranslationResult = () => {
    webViewRef.current?.injectJavaScript(detectTranslationJS);
  };

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

  // Scrape lyrics as soon as they're detected, once per page. In the automatic flow from the
  // now playing notification, also follow a supported lyrics site from Google results when Google has none
  const handleLyricsDetected = (hasLyrics: boolean) => {
    if (hasLyrics) {
      if (autoScrapedUrl.current === currentUrl) return;
      autoScrapedUrl.current = currentUrl;
      handleScrapeLyrics();
    } else if (
      useStore.getState().autoFetch?.step === 'lyrics' &&
      currentUrl.includes('google.com') &&
      autoFollowedUrl.current !== currentUrl
    ) {
      autoFollowedUrl.current = currentUrl;
      // Give Google's lyrics panel a moment to render before falling back
      setTimeout(() => webViewRef.current?.injectJavaScript(followLyricsLinkJS), 1500);
    }
  };

  // Genius sends every version of the song from its Translations dropdown. Getting the original, it fills in a
  // tab for each of the others; a translation tab takes its language's version. A version that couldn't be
  // fetched is opened here so the user can get past Genius's captcha, and is scraped once its lyrics show
  const handleGeniusVersions = (data: any) => {
    const versions = mergeGeniusVersions(geniusImport.current, data.geniusVersions as GeniusVersion[]);
    if (scrapeTargetTab > 0) {
      geniusImport.current = null;
      const target = versions.find((v) => v.text && translationLanguageOf(v) === scrapeTargetLanguage) ?? data.geniusVersions[0];
      navigation.navigate('Editor', {
        scrapedLyrics: cleanGeniusLyrics(target.text!.trim()),
        scrapedSourceUrl: target.url,
        scrapedPageTitle: target.title ?? '',
        scrapedTargetTab: scrapeTargetTab,
      });
      return;
    }
    const missing = versions.find((v) => !v.text);
    if (missing) {
      geniusImport.current = versions;
      setToast(`Opening the ${translationLanguageOf(missing) ?? missing.language} version. Solve the captcha if Genius shows one`);
      setWebUrl(missing.url);
      return;
    }
    geniusImport.current = null;
    const { original, translations } = splitGeniusVersions(versions);
    navigation.navigate('Editor', {
      scrapedLyrics: cleanGeniusLyrics(original.text!.trim()),
      scrapedSourceUrl: original.url,
      scrapedPageTitle: original.title ?? '',
      scrapedTargetTab: 0,
      scrapedLanguageCode: translationLanguageOf(original) ?? original.language,
      scrapedTranslations: translations.map((t) => ({ ...t, lyrics: cleanGeniusLyrics(t.lyrics.trim()) })),
    });
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
        handleLyricsDetected(data.hasLyrics === true);
        return;
      }
      if (data.type === 'translationDetected') {
        setWaitingForTranslation(!data.hasTranslation);
        return;
      }
      if (data.type === 'lyrics' && Array.isArray(data.geniusVersions) && data.text) {
        handleGeniusVersions(data);
        return;
      }
      // A page with a translation too (LyricsTranslate, Musixmatch, Letras) sends it along: it fills in a translation
      // tab when getting the original, or is what a translation tab gets
      const pageTranslation = typeof data.translation === 'string' ? data.translation.trim() : '';
      if (data.type === 'lyrics' && (data.text || (scrapeTargetTab > 0 && pageTranslation))) {
        // A Romanized tab takes whichever of the page's lyrics and translation is in the Latin alphabet,
        // e.g. LyricsTranslate's transliteration or Genius Romanizations' lyrics
        const takeTranslation = scrapeTargetTab > 0 && !!pageTranslation &&
          (!isRomanized(scrapeTargetLanguage ?? '') || !data.text || !isMostlyLatin(data.text));
        let lyrics = takeTranslation ? pageTranslation : data.text.trim();
        if (currentUrl.includes('genius.com')) {
          lyrics = cleanGeniusLyrics(lyrics);
        }
        const withTranslation = scrapeTargetTab === 0 && !!pageTranslation;
        navigation.navigate('Editor', {
          scrapedLyrics: lyrics,
          scrapedSourceUrl: currentUrl,
          scrapedPageTitle: data.title ?? '',
          scrapedTargetTab: scrapeTargetTab,
          scrapedLanguageCode: data.languageCode || '',
          scrapedTranslations: withTranslation
            ? [{ language: data.translationLanguage, lyrics: pageTranslation, url: currentUrl, title: data.title ?? '' }]
            : undefined,
        });
      }
      if (data.type === 'translation' && data.text) {
        let translation = data.text.trim();

        // Handle multi-chunk translation workflow
        if (deeplChunks && deeplChunks.length > 1) {
          // Store this chunk's translation
          addDeeplTranslatedChunk(translation);

          const nextChunkIndex = deeplCurrentChunk + 1;

          // Check if there are more chunks to translate
          if (nextChunkIndex < deeplChunks.length) {
            // Move to next chunk
            setDeeplCurrentChunk(nextChunkIndex);

            // Paste the next chunk into DeepL
            pendingPasteText.current = deeplChunks[nextChunkIndex];

            // Reload the page to clear and paste next chunk
            webViewRef.current?.reload();
            return; // Don't navigate back yet
          } else {
            // All chunks translated - join them
            const allTranslations = [
              ...deeplTranslatedChunks,
              translation,
            ];
            translation = joinChunks(allTranslations);
          }
        }

        // Remap translation using the line map if available
        if (deeplLineMap) {
          translation = remapTranslation(translation, deeplLineMap);
        }

        // Clear DeepL state
        resetDeeplTranslation();

        // Navigate back to editor with complete translation
        navigation.navigate('Editor', {
          scrapedLyrics: translation,
          scrapedSourceUrl: currentUrl,
          scrapedPageTitle: data.title ?? '',
          scrapedTargetTab: scrapeTargetTab,
        });
      }
      if (data.type === 'error') {
        setToast(data.message || 'Failed to scrape lyrics');
        if (useStore.getState().autoFetch?.step === 'lyrics') useStore.getState().setAutoFetch(null);
      }
    } catch (e) {
      // ignore parse errors
    }
  };

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS !== 'android' || !isFocused) {
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
  }, [
    canGoBack,
    isFocused,
  ]);

  // Handle pasting into DeepL
  useEffect(() => {
    const pasteText = route.params?.pasteIntoDeepL as string | undefined;
    if (pasteText) {
      // Store the text to paste, will be injected after page loads
      pendingPasteText.current = pasteText;
      navigation.setParams({
        pasteIntoDeepL: undefined,
      });
    }
  }, [
    route.params?.pasteIntoDeepL,
  ]);

  // Force WebView to reload when URL changes, even if it's the same URL
  useEffect(() => {
    setWebViewKey((prev) => prev + 1);
  }, [
    webUrl,
  ]);

  // Auto-scrape translation when it becomes ready
  useEffect(() => {
    // Check if translation just became ready (changed from waiting to ready)
    const translationJustBecameReady = previousWaitingForTranslation.current && !waitingForTranslation;

    if (translationJustBecameReady && showTranslationFab && currentUrl.includes('deepl.com')) {
      // Automatically scrape the translation
      handleScrapeTranslation();
    }

    // Update previous state
    previousWaitingForTranslation.current = waitingForTranslation;
  }, [
    waitingForTranslation,
    showTranslationFab,
    currentUrl,
  ]);

  return (
    <View
      style={[
        styles.container,
        isWide && {
          paddingLeft: SIDE_NAV_WIDTH,
        },
      ]}
    >
      <View
        style={[
          styles.addressBar,
          {
            paddingTop: insets.top || 6,
          },
        ]}
      >
        {showUrlInput ? (
          <>
            <TextInput
              style={styles.addressInput}
              value={addressText}
              onChangeText={setAddressText}
              onSubmitEditing={() => {
                handleNavigate();
                setShowUrlInput(false);
              }}
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
            <TouchableOpacity
              onPress={() => {
                handleNavigate();
                setShowUrlInput(false);
              }}
              style={styles.goButton}
              accessibilityRole="button"
              accessibilityLabel="Go"
            >
              <Ionicons
                name="arrow-forward-circle"
                size={28}
                color={Colors.primary}
              />
            </TouchableOpacity>
          </>
        ) : (
          <>
            {canGoBack && (
              <TouchableOpacity
                onPress={() => webViewRef.current?.goBack()}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Previous page"
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.titleButton}
              onPress={() => setShowUrlInput(true)}
            >
              {getFaviconUrl(currentUrl) && (
                <Image
                  source={{
                    uri: getFaviconUrl(currentUrl)!,
                  }}
                  style={styles.favicon}
                />
              )}
              <Text
                style={styles.titleText}
                numberOfLines={1}
              >
                {pageTitle || addressText}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      <WebView
        key={webViewKey}
        ref={webViewRef}
        source={{
          uri: webUrl,
        }}
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
        onLoadProgress={({ nativeEvent }) => {
          if (nativeEvent.progress >= 1) {
            setLoading(false);
            injectDetectionScripts(nativeEvent.url);
          }
        }}
        onLoadEnd={(event) => {
          setLoading(false);
          const actualUrl = event?.nativeEvent?.url || currentUrl;
          injectDetectionScripts(actualUrl);
        }}
        onMessage={handleMessage}
        javaScriptEnabled
      />
      {loading && (
        <View
          accessibilityLabel="Loading Overlay"
          style={styles.loadingOverlay}
        >
          <ActivityIndicator
            size="large"
            color={Colors.primary}
          />
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
          text={
            waitingForTranslation
              ? deeplChunks && deeplChunks.length > 1
                ? `Waiting for Translation... (${deeplCurrentChunk + 1}/${deeplChunks.length})`
                : 'Waiting for Translation...'
              : deeplChunks && deeplChunks.length > 1
                ? `Get Translation (${deeplCurrentChunk + 1}/${deeplChunks.length})`
                : 'Get Translation'
          }
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
