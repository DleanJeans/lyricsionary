import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, useWindowDimensions, TextInput } from 'react-native';
import { WebView } from '../components/WebView';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { Colors } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { SIDE_NAV_WIDTH, WIDE_BREAKPOINT } from '../hooks/useLayout';
import { cleanGeniusLyrics } from '../utils/cleanLyrics';

const LYRICS_DOMAINS = ['genius.com', 'musixmatch.com', 'lyricstranslate.com'];

export default function WebScreen() {
  const navigation = useNavigation<any>();
  const { webUrl, setWebUrl } = useStore();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  const webViewRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState(webUrl);
  const [addressText, setAddressText] = useState(webUrl);
  const [showFab, setShowFab] = useState(false);
  const [loading, setLoading] = useState(false);

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
    console.log({hasLyrics})
    setShowFab(hasLyrics);
  };

  const handleScrapeLyrics = () => {
    // Inject JS to extract lyrics text from page
    const injectedJS = `
      (function() {
        let lyrics = '';
        // Google
        const google = document.querySelectorAll('div[data-song-title]');
        if (google.length > 0) {
          google.forEach(el => { lyrics += el.innerText + '\\n'; });
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'lyrics', text: lyrics }));
          return;
        }

        // Genius
        const genius = document.querySelectorAll('[data-lyrics-container="true"]');
        if (genius.length > 0) {
          genius.forEach(el => { lyrics += el.innerText + '\\n'; });
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'lyrics', text: lyrics }));
          return;
        }

        // Musixmatch
        const musix = document.querySelectorAll('.lyrics__content__ok, .mxm-lyrics__content');
        if (musix.length > 0) {
          musix.forEach(el => { lyrics += el.innerText + '\\n'; });
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'lyrics', text: lyrics }));
          return;
        }

        // LyricsTranslate
        const lt = document.querySelectorAll('.ltf, .song-node');
        if (lt.length > 0) {
          lt.forEach(el => { lyrics += el.innerText + '\\n'; });
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'lyrics', text: lyrics }));
          return;
        }
        
        // Generic: try to grab visible text from body
        const body = document.body.innerText;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'lyrics', text: body.substring(0, 5000) }));
      })();
      true;
    `;
    webViewRef.current?.injectJavaScript(injectedJS);
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'lyrics' && data.text) {
        // Clean lyrics if from Genius
        let lyrics = data.text.trim();
        if (currentUrl.includes('genius.com')) {
          lyrics = cleanGeniusLyrics(lyrics);
        }
        // Navigate to Editor with scraped lyrics
        navigation.navigate('Editor', { scrapedLyrics: lyrics });
      }
    } catch (e) {
      // ignore parse errors
    }
  };

  return (
    <View style={[styles.container, isWide && { paddingLeft: SIDE_NAV_WIDTH }]}>
      <View style={styles.addressBar}>
        <TextInput
          style={styles.addressInput}
          value={addressText}
          onChangeText={setAddressText}
          onSubmitEditing={handleNavigate}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          selectTextOnFocus
          placeholderTextColor={Colors.textMuted}
          placeholder="Enter URL"
        />
        <TouchableOpacity onPress={handleNavigate} style={styles.goButton}>
          <Ionicons name="arrow-forward-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      <WebView
        ref={webViewRef}
        source={{ uri: webUrl }}
        style={styles.webview}
        onNavigationStateChange={(navState) => {
          setCurrentUrl(navState.url);
          setAddressText(navState.url);
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
