import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, Linking, Platform } from 'react-native';
import { DefaultTheme, NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
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
import { useReviewReminderResponse, useReviewReminderSchedule, useStreakSaverSchedule } from './src/services/reviewReminder';
import { completeSpotifySignIn, isSpotifyCallback, isSpotifyConnected } from './src/services/spotify';
import { usePartOfSpeechBackfill } from './src/hooks/usePartOfSpeechBackfill';
import { useIsWide } from './src/hooks/useLayout';
import ReviewSession from './src/components/ReviewSession';
import { buildLaunchReview, type ReviewItem } from './src/utils/reviewQuiz';
import { flushWrites } from './src/services/storageWrites';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const linking = {
  prefixes: ['lyricsionary://', 'lyricsionary-dev://', 'exp+lyricsionary://'],
  // Spotify's sign-in comes back to its own handler, not a screen
  filter: (url: string) => !isSpotifyCallback(url),
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

// Anything a screen doesn't cover shows the app background instead of the default light grey
const navigationTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: Colors.background } };

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const [navigationReady, setNavigationReady] = useState(false);
  const [nowPlayingRequest, setNowPlayingRequest] = useState<NowPlayingRequest | null>(null);
  useNowPlayingResponse(setNowPlayingRequest);
  const loadSongs = useStore((s) => s.loadSongs);
  const loadWords = useStore((s) => s.loadWords);
  const loadIgnoredWords = useStore((s) => s.loadIgnoredWords);
  const loadCompoundSplits = useStore((s) => s.loadCompoundSplits);
  const loadLearnSettings = useStore((s) => s.loadLearnSettings);
  const loadActivity = useStore((s) => s.loadActivity);
  const [dataLoaded, setDataLoaded] = useState(false);
  usePartOfSpeechBackfill(dataLoaded);
  const words = useStore((s) => s.words);
  const reviewReminder = useStore((s) => s.reviewReminder);
  useReviewReminderSchedule(words, reviewReminder, dataLoaded);
  // The same switch also saves the streak, with a 9 PM reminder on a day with nothing done yet
  const activity = useStore((s) => s.activity);
  useStreakSaverSchedule(activity, reviewReminder, dataLoaded);
  const [reviewReminderTapped, setReviewReminderTapped] = useState(false);
  useReviewReminderResponse(() => setReviewReminderTapped(true));
  // Opening the app starts a review of 10 due words from the songs opened last
  const [launchReview, setLaunchReview] = useState<ReviewItem[] | null>(null);
  const isWide = useIsWide();

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
      await Promise.all([loadSongs(), loadWords(), loadIgnoredWords(), loadCompoundSplits(), loadLearnSettings(), loadActivity()]);
      if (!mounted) return;
      const { songs, words } = useStore.getState();
      const review = buildLaunchReview(songs, words);
      if (review.length) setLaunchReview(review);
      setDataLoaded(true);
      await checkForUpdates();
    }

    void initialize();
    return () => {
      mounted = false;
    };
  }, [loadSongs, loadWords, loadIgnoredWords, loadCompoundSplits, loadLearnSettings, loadActivity]);

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

  // Finishes Spotify sign-in when its page sends the app back, and knows whether it's signed in
  useEffect(() => {
    const { setSpotifyConnected } = useStore.getState();
    void isSpotifyConnected().then(setSpotifyConnected);
    const handle = async (url: string | null) => {
      if (!url || !isSpotifyCallback(url)) return;
      try {
        if (await completeSpotifySignIn(url)) setSpotifyConnected(true);
      } catch (error) {
        console.error('Spotify sign-in failed:', error);
      }
      // On web the sign-in lands on its own path; go back to the app's start
      if (Platform.OS === 'web') window.history.replaceState(null, '', '/');
    };
    void Linking.getInitialURL().then(handle);
    const subscription = Linking.addEventListener('url', ({ url }) => void handle(url));
    return () => subscription.remove();
  }, []);

  // The review reminder opens Words, where the Review button is
  useEffect(() => {
    if (!navigationReady || !reviewReminderTapped) return;
    setReviewReminderTapped(false);
    const nav = navigationRef as any;
    if (navigationRef.getRootState()?.routeNames.includes('Tabs')) nav.navigate('Tabs', { screen: 'Words' });
    else nav.navigate('Words');
  }, [navigationReady, reviewReminderTapped, navigationRef]);

  // Saves wait a moment so a tap's change shows first; leaving the app writes them right away, in case
  // it's closed before then
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void flushWrites();
    });
    return () => subscription.remove();
  }, []);

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
        <NavigationContainer ref={navigationRef} linking={linking} theme={navigationTheme} onReady={() => setNavigationReady(true)}>
          <AppNavigator />
        </NavigationContainer>
        {launchReview && <ReviewSession dueItems={launchReview} onClose={() => setLaunchReview(null)} isWide={isWide} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
