import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { Colors } from '../constants/theme';
import Constants from 'expo-constants';

export default function VersionInfo() {
  const [isChecking, setIsChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    updateId: string | null;
    commitSha: string | null;
  }>({ updateId: null, commitSha: null });

  useEffect(() => {
    // Get current update information
    const currentUpdateId = Updates.updateId;

    // Try to get commit info from manifest
    // The structure varies depending on how the update was published
    let commitSha: string | null = null;

    if (Updates.manifest) {
      // Check different possible locations for commit info
      const manifest = Updates.manifest as any;
      if (manifest?.metadata?.commitId) {
        commitSha = manifest.metadata.commitId;
      } else if (manifest?.extra?.expoClient?.commitId) {
        commitSha = manifest.extra.expoClient.commitId;
      } else if (manifest?.commitId) {
        commitSha = manifest.commitId;
      }
    }

    setUpdateInfo({
      updateId: currentUpdateId || null,
      commitSha: commitSha,
    });
  }, []);

  // Extract update group ID (first 8 characters of updateId)
  const updateGroupId = updateInfo.updateId ? updateInfo.updateId.substring(0, 8) : 'dev';

  // Extract commit SHA (first 7 characters)
  const commitSha = updateInfo.commitSha ? updateInfo.commitSha.substring(0, 7) : 'dev';
  const fullCommitSha = updateInfo.commitSha || '';

  // Get project info from app.json
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const owner = Constants.expoConfig?.owner || 'dleanjeans';
  const slug = Constants.expoConfig?.slug || 'lyricsionary';

  // Build URLs
  const updateGroupUrl = updateInfo.updateId && projectId
    ? `https://expo.dev/accounts/${owner}/projects/${slug}/updates/${updateInfo.updateId}`
    : null;

  const commitUrl = fullCommitSha
    ? `https://github.com/DleanJeans/lyricsionary/commit/${fullCommitSha}`
    : null;

  const handleUpdateCheck = async () => {
    if (__DEV__) {
      Alert.alert(
        'Development Mode',
        'Update checking is only available in production builds.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsChecking(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert(
          'Update Available',
          'A new update is available. The app will now download and restart.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Update',
              onPress: async () => {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'No Updates',
          'You are already running the latest version.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Update Check Failed',
        'Failed to check for updates. Please try again later.',
        [{ text: 'OK' }]
      );
      console.error('Error checking for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleLinkPress = (url: string | null) => {
    if (url) {
      Linking.openURL(url).catch((err) =>
        console.error('Failed to open URL:', err)
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Update Group ID */}
      <TouchableOpacity
        style={styles.infoRow}
        onPress={() => handleLinkPress(updateGroupUrl)}
        disabled={!updateGroupUrl}
      >
        <Text style={styles.label}>Update Group ID:</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{updateGroupId}</Text>
          {updateGroupUrl && (
            <Ionicons name="open-outline" size={14} color={Colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>

      {/* Commit ID */}
      <TouchableOpacity
        style={styles.infoRow}
        onPress={() => handleLinkPress(commitUrl)}
        disabled={!commitUrl}
      >
        <Text style={styles.label}>Commit:</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{commitSha}</Text>
          {commitUrl && (
            <Ionicons name="open-outline" size={14} color={Colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>

      {/* Check for updates button */}
      <TouchableOpacity
        style={[styles.updateButton, isChecking && styles.updateButtonDisabled]}
        onPress={handleUpdateCheck}
        disabled={isChecking}
      >
        {isChecking ? (
          <ActivityIndicator size="small" color={Colors.text} />
        ) : (
          <>
            <Ionicons name="refresh-outline" size={18} color={Colors.text} />
            <Text style={styles.updateButtonText}>Check for Updates</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  infoRow: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  updateButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },
});
