import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, useWindowDimensions, TextInput, BackHandler, ToastAndroid, Platform, Image } from 'react-native';
import { WebView } from '../components/WebView';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Colors } from '../constants/theme';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SIDE_NAV_WIDTH, WIDE_BREAKPOINT } from '../hooks/useLayout';
import { cleanGeniusLyrics } from '../utils/cleanLyrics';
import { scrapeLyricsJS } from '../utils/scrapeLyricsJS';
import DrawerButton from '../components/DrawerButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LYRICS_DOMAINS = ['genius.com', 'musixmatch.com', 'lyricstranslate.com'];

const getFaviconUrl = (url: string): string | null => {
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return null;
  }
};

export default function WebScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { webUrl, setWebUrl } = useStore();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState(webUrl);
  const [addressText, setAddressText] = useState(webUrl);
  const [pageTitle, setPageTitle] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showFab, setShowFab] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const backPressedOnce = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const targetTabRef = useRef<number>(0);
  useEffect(() => {
    targetTabRef.current = route.params?.targetTab ?? 0;
  }, [route.params?.targetTab]);

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

  const checkForLyrics = (url: string) => {
    const hasLyrics = LYRICS_DOMAINS.some((d) => url.includes(d)) ||
      url.includes('google.com/search') && url.includes('lyrics');
    setShowFab(hasLyrics);
  };

  const handleScrapeLyrics = () => {
    webViewRef.current?.injectJavaScript(scrapeLyricsJS);
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'debug') {
        console.log('[WebView]', typeof data.log === 'object' ? JSON.stringify(data.log) : data.log);
        return;
      }
      if (data.type === 'lyrics' && data.text) {
        let lyrics = data.text.trim();
        if (currentUrl.includes('genius.com')) {
          lyrics = cleanGeniusLyrics(lyrics);
        }
        navigation.navigate('Editor', { scrapedLyrics: lyrics, scrapedSourceUrl: currentUrl, scrapedPageTitle: data.title ?? '', scrapedTargetTab: targetTabRef.current });
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

  return (
    <View style={[styles.container, isWide && { paddingLeft: SIDE_NAV_WIDTH }]}>
      <View style={[styles.addressBar, { paddingTop: insets.top || 6 }]}>
        <DrawerButton />
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
          <TouchableOpacity style={styles.titleButton} onPress={() => setShowUrlInput(true)}>
            {getFaviconUrl(currentUrl) && (
              <Image source={{ uri: getFaviconUrl(currentUrl)! }} style={styles.favicon} />
            )}
            <Text style={styles.titleText} numberOfLines={1}>{pageTitle || addressText}</Text>
          </TouchableOpacity>
        )}
      </View>
      <WebView
        ref={webViewRef}
        source={{ uri: webUrl }}
        style={styles.webview}
        onNavigationStateChange={(navState) => {
          setCurrentUrl(navState.url);
          setAddressText(navState.url);
          setPageTitle(navState.title ?? '');
          setShowUrlInput(false);
          setCanGoBack(navState.canGoBack);
          checkForLyrics(navState.url);
        }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onMessage={handleMessage}
        javaScriptEnabled
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
      {true && (
        <TouchableOpacity style={styles.fab} onPress={handleScrapeLyrics} activeOpacity={0.8}>
          <Ionicons name="download-outline" size={26} color={Colors.white} />
          <Text style={styles.fabText}>Get Lyrics</Text>
        </TouchableOpacity>
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
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    backgroundColor: Colors.primary,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
