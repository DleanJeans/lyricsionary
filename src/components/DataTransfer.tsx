import { Ionicons } from '@expo/vector-icons';
import { reloadAppAsync } from 'expo';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { Backup, backupFileName, createBackup, parseBackup, restoreBackup, summarizeBackup } from '../services/backup';
import { pickBackupFile, saveBackupFile, saveSafetyCopy } from '../services/backupFile';
import ConfirmDialog from './ConfirmDialog';
import { Text } from './Text';

const appName = Constants.expoConfig?.name ?? 'Lyricsionary';

type Status = {
  text: string;
  error?: boolean;
} | null;

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

function describeBackup(backup: Backup) {
  const { songs, words } = summarizeBackup(backup);
  const date = backup.exportedAt ? ` on ${new Date(backup.exportedAt).toLocaleString()}` : '';
  return `${plural(songs, 'song')} and ${plural(words, 'word')} from ${backup.appName}${date}.`;
}

/** Export and import every song, word and setting, e.g. to move them between the prod and dev builds */
export default function DataTransfer() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState<Backup | null>(null);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setStatus(null);
    try {
      await task();
    } catch (e) {
      setStatus({
        text: errorText(e),
        error: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const exportToFile = () =>
    run(async () => {
      const backup = await createBackup(appName);
      const fileName = backupFileName();
      if (await saveBackupFile(JSON.stringify(backup), fileName)) {
        setStatus({
          text: `Saved ${fileName}`,
        });
      }
    });

  const copyToClipboard = () =>
    run(async () => {
      await Clipboard.setStringAsync(JSON.stringify(await createBackup(appName)));
      setStatus({
        text: 'Copied. Paste it in the other app.',
      });
    });

  const importFromFile = () =>
    run(async () => {
      const json = await pickBackupFile();
      if (json !== null) setPending(parseBackup(json));
    });

  const pasteFromClipboard = () =>
    run(async () => {
      const json = await Clipboard.getStringAsync();
      if (!json.trim()) throw new Error('The clipboard is empty.');
      setPending(parseBackup(json));
    });

  const confirmImport = (backup: Backup) =>
    run(async () => {
      try {
        saveSafetyCopy(JSON.stringify(await createBackup(appName)));
      } catch (e) {
        console.warn('Could not keep a copy of the data before importing', e);
      }
      await restoreBackup(backup);
      setPending(null);
      // The store and saved screen preferences only read storage on start
      await reloadAppAsync('Imported a backup');
    });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Your data</Text>
      <Text style={styles.description}>Move songs, words and settings between Lyricsionary and Lyricsionary Dev.</Text>

      <View style={styles.row}>
        <TouchableOpacity
          style={styles.button}
          onPress={exportToFile}
          disabled={busy}
        >
          <Ionicons
            name="download-outline"
            size={16}
            color={Colors.text}
          />
          <Text style={styles.buttonText}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={importFromFile}
          disabled={busy}
        >
          <Ionicons
            name="folder-open-outline"
            size={16}
            color={Colors.text}
          />
          <Text style={styles.buttonText}>Import</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={copyToClipboard}
          disabled={busy}
        >
          <Ionicons
            name="copy-outline"
            size={14}
            color={Colors.textSecondary}
          />
          <Text style={styles.linkText}>Copy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={pasteFromClipboard}
          disabled={busy}
        >
          <Ionicons
            name="clipboard-outline"
            size={14}
            color={Colors.textSecondary}
          />
          <Text style={styles.linkText}>Paste</Text>
        </TouchableOpacity>
        {busy && (
          <ActivityIndicator
            size="small"
            color={Colors.textSecondary}
          />
        )}
      </View>

      {status && (
        <Text
          style={[
            styles.status,
            status.error && styles.statusError,
          ]}
        >
          {status.text}
        </Text>
      )}

      <ConfirmDialog
        visible={pending !== null}
        title={`Replace data in ${appName}?`}
        message={
          pending
            ? `${describeBackup(pending)}\n\nThis replaces all songs, words and settings in this app, then restarts it.`
            : ''
        }
        confirmText="Replace"
        destructive
        loading={busy}
        onConfirm={() => pending && confirmImport(pending)}
        onCancel={() => setPending(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  label: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingRight: 8,
  },
  linkText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  status: {
    fontSize: 12,
    color: Colors.success,
  },
  statusError: {
    color: Colors.danger,
  },
});
