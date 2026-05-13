import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import VersionInfo from '../components/VersionInfo';

export default function SideDrawer(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();

  const handleExitToLauncher = () => {
    // Exit to Expo launcher - this only works in development builds with expo-dev-client
    // In production or Expo Go, this will have no effect
    if (typeof (global as any).expo?.modules?.DevLauncher !== 'undefined') {
      (global as any).expo.modules.DevLauncher.navigateToLauncherAsync();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 20) }]}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <Ionicons name="musical-notes" size={26} color={Colors.primary} />
          <Text style={styles.appName}>Lyricsionary</Text>
        </View>

        <View style={styles.divider} />

        {/* Version Info */}
        <VersionInfo />

        <View style={styles.divider} />

        {/* Exit to Launcher Button */}
        <TouchableOpacity
          style={styles.exitButton}
          onPress={handleExitToLauncher}
        >
          <Ionicons name="exit-outline" size={18} color={Colors.text} />
          <Text style={styles.exitButtonText}>Exit to Launcher</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  exitButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 8,
  },
  exitButtonText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },
});
