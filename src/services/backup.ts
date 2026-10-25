import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@lyricsionary_';
// What this install last played belongs to this phone, not to the data being moved
const DEVICE_ONLY_KEYS = [
  '@lyricsionary_last_media',
  '@lyricsionary_last_notified_media',
];
const FORMAT = 'lyricsionary-backup';
const VERSION = 1;

export interface Backup {
  format: typeof FORMAT;
  version: number;
  /** The build it came from, e.g. "Lyricsionary Dev" */
  appName: string;
  exportedAt: string;
  /** Raw AsyncStorage values, keyed by storage key */
  data: Record<string, string>;
}

export interface BackupSummary {
  songs: number;
  words: number;
}

const isSyncedKey = (key: string) => key.startsWith(KEY_PREFIX) && !DEVICE_ONLY_KEYS.includes(key);

async function getSyncedKeys(): Promise<string[]> {
  return (await AsyncStorage.getAllKeys()).filter(isSyncedKey);
}

/** Reads every saved song, word and setting, so a new key is included without listing it here */
export async function createBackup(appName: string): Promise<Backup> {
  const entries = await AsyncStorage.multiGet(await getSyncedKeys());
  const data: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (value !== null) data[key] = value;
  }
  return {
    format: FORMAT,
    version: VERSION,
    appName,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function parseBackup(json: string): Backup {
  let backup: unknown;
  try {
    backup = JSON.parse(json);
  } catch {
    throw new Error("This isn't a Lyricsionary backup.");
  }
  const b = backup as Partial<Backup> | null;
  if (b?.format !== FORMAT || typeof b.data !== 'object' || b.data === null) {
    throw new Error("This isn't a Lyricsionary backup.");
  }
  if (typeof b.version !== 'number' || b.version > VERSION) {
    throw new Error('This backup is from a newer version of Lyricsionary. Update this app first.');
  }
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(b.data)) {
    if (isSyncedKey(key) && typeof value === 'string') data[key] = value;
  }
  return {
    format: FORMAT,
    version: b.version,
    appName: typeof b.appName === 'string' ? b.appName : 'Lyricsionary',
    exportedAt: typeof b.exportedAt === 'string' ? b.exportedAt : '',
    data,
  };
}

function countItems(json: string | undefined): number {
  if (!json) return 0;
  try {
    const items = JSON.parse(json);
    return Array.isArray(items) ? items.length : 0;
  } catch {
    return 0;
  }
}

export function summarizeBackup(backup: Backup): BackupSummary {
  return {
    songs: countItems(backup.data['@lyricsionary_songs']),
    words: countItems(backup.data['@lyricsionary_words']),
  };
}

/** Replaces this install's data with the backup's; the app must reload afterwards to show it */
export async function restoreBackup(backup: Backup): Promise<void> {
  const stale = (await getSyncedKeys()).filter((key) => !(key in backup.data));
  if (stale.length > 0) await AsyncStorage.multiRemove(stale);
  await AsyncStorage.multiSet(Object.entries(backup.data));
}

export const backupFileName = (date = new Date()) => `lyricsionary-backup-${date.toISOString().slice(0, 10)}.json`;
