import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Updates from 'expo-updates';
import AppNavigator from './src/navigation/AppNavigator';
import { useStore } from './src/store/useStore';

const linking = {
  prefixes: ['exp+lyricsionary://'],
  config: {
    screens: {
      Editor: 'editor/:songId?',
      Web: 'web',
      Learn: 'learn/:songId?',
      Lyrics: 'lyrics',
      Words: 'words',
    },
  },
};

export default function App() {
  const loadSongs = useStore((s) => s.loadSongs);
  const loadWords = useStore((s) => s.loadWords);

  useEffect(() => {
    loadSongs();
    loadWords();

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

    checkForUpdates();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer linking={linking}>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
