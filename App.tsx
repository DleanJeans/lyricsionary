import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { useStore } from './src/store/useStore';

export default function App() {
  const loadSongs = useStore((s) => s.loadSongs);
  const loadWords = useStore((s) => s.loadWords);

  useEffect(() => {
    loadSongs();
    loadWords();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <AppNavigator />
    </NavigationContainer>
  );
}
