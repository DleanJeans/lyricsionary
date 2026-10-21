import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Updates from 'expo-updates';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from './src/constants/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { useStore } from './src/store/useStore';
import { NowPlayingRequest, setupNowPlayingNotifications, useNowPlayingResponse } from './src/services/nowPlayingNotification';
import { findSavedSong } from './src/utils/nowPlaying';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const linking = {
  prefixes: ['lyricsionary://', 'lyricsionary-dev://', 'exp+lyricsionary://'],
  config: {
    screens: {
      Editor: 'editor/:songId?',
      Web: 'web',
      Learn: 'learn/:songId?',
      Songs: 'songs',
      Words: 'words',
    },
  },
};

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const [navigationReady, setNavigationReady] = useState(false);
  const [nowPlayingRequest, setNowPlayingRequest] = useState<NowPlayingRequest | null>(null);
  useNowPlayingResponse(setNowPlayingRequest);
  const loadSongs = useStore((s) => s.loadSongs);
  const loadWords = useStore((s) => s.loadWords);
  const loadIgnoredWords = useStore((s) => s.loadIgnoredWords);
  const loadCompoundSplits = useStore((s) => s.loadCompoundSplits);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load fonts
  const [fontsLoaded, fontError] = useFonts({
    GoogleSans: require('./assets/fonts/GoogleSans.ttf'),
    'GoogleSans-Bold': require('./assets/fonts/GoogleSans-Bold.ttf'),
  });

  useEffect(() => {
    setupNowPlayingNotifications();

    // Check for expo-updates on mount
    async function checkForUpdates() {
      try {
        // Only check for updates in production builds
        if (!__DEV__) {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }
        }
      } catch (error) {
        console.log('Error checking for updates:', error);
      }
    }

    let mounted = true;
    async function initialize() {
      await Promise.all([loadSongs(), loadWords(), loadIgnoredWords(), loadCompoundSplits()]);
      if (mounted) setDataLoaded(true);
      await checkForUpdates();
    }

    void initialize();
    return () => {
      mounted = false;
    };
  }, [loadSongs, loadWords, loadIgnoredWords, loadCompoundSplits]);

  // Tapping the now playing notification opens the saved song in Learn,
  // or starts the automatic lyrics + translation flow in Editor
  useEffect(() => {
    if (!navigationReady || !nowPlayingRequest) return;
    const request = nowPlayingRequest;
    setNowPlayingRequest(null);
    (async () => {
      await loadSongs();
      const { songs, setCurrentSongId, trackSongOpen } = useStore.getState();
      const saved = findSavedSong(songs, request.songName, request.artistName);
      if (saved) {
        setCurrentSongId(saved.id);
        trackSongOpen(saved.id);
      }
      const [screen, params] = saved ? ['Learn', undefined] : ['Editor', { autoFetchSong: request }];
      // On narrow screens the tabs are nested inside the drawer's "Tabs" screen
      const nav = navigationRef as any;
      if (navigationRef.getRootState()?.routeNames.includes('Tabs')) {
        nav.navigate('Tabs', { screen, params });
      } else {
        nav.navigate(screen, params);
      }
    })();
  }, [navigationReady, nowPlayingRequest]);

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if ((fontsLoaded || fontError) && dataLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, dataLoaded]);

  // Don't render the app until fonts and persisted data are loaded
  if ((!fontsLoaded && !fontError) || !dataLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
        backgroundColor: Colors.background,
      }}
    >
      <StatusBar style="light" />
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef} linking={linking} onReady={() => setNavigationReady(true)}>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
