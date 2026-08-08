import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Updates from 'expo-updates';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './src/navigation/AppNavigator';
import { useStore } from './src/store/useStore';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const linking = {
  prefixes: ['exp+lyricsionary://'],
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
  const loadSongs = useStore((s) => s.loadSongs);
  const loadWords = useStore((s) => s.loadWords);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load fonts
  const [fontsLoaded, fontError] = useFonts({
    GoogleSans: require('./assets/fonts/GoogleSans.ttf'),
    'GoogleSans-Bold': require('./assets/fonts/GoogleSans-Bold.ttf'),
  });

  useEffect(() => {
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
      await Promise.all([loadSongs(), loadWords()]);
      if (mounted) setDataLoaded(true);
      await checkForUpdates();
    }

    void initialize();
    return () => {
      mounted = false;
    };
  }, [loadSongs, loadWords]);

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaProvider>
        <NavigationContainer linking={linking}>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
