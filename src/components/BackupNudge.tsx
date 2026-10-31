import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { useStore } from '../store/useStore';
import { getLastBackupAt, needsBackup } from '../services/backup';
import { exportBackupToFile } from './DataTransfer';
import { Text } from './Text';

const DAY_MS = 86_400_000;

/** In the sidebar, after a week without a backup: a reminder to export one, with a button that does it */
export default function BackupNudge() {
  const wordCount = useStore((s) => s.words.length);
  const [lastBackupAt, setLastBackupAt] = useState<number | null | undefined>(undefined);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getLastBackupAt().then(setLastBackupAt);
  }, []);

  const now = Date.now();
  if (hidden || lastBackupAt === undefined || !needsBackup(lastBackupAt, wordCount, now)) return null;

  const backUp = async () => {
    setBusy(true);
    try {
      if (await exportBackupToFile()) setLastBackupAt(Date.now());
    } catch (e) {
      console.warn('Backup failed', e);
    } finally {
      setBusy(false);
    }
  };
  const days = lastBackupAt ? Math.floor((now - lastBackupAt) / DAY_MS) : null;

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-download-outline" size={18} color={Colors.warning} />
      <Text style={styles.text}>
        {days === null
          ? `${wordCount} words and no backup yet`
          : `Last backup ${days} days ago`}
      </Text>
      <TouchableOpacity onPress={() => void backUp()} disabled={busy} style={styles.button} accessibilityRole="button">
        <Text style={styles.buttonText}>Back up</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setHidden(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Not now">
        <Ionicons name="close" size={16} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: { flex: 1, fontSize: 13, color: Colors.text },
  button: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  buttonText: { fontSize: 13, fontWeight: '600', color: Colors.white },
});
