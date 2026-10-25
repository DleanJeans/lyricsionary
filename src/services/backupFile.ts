import { requireOptionalNativeModule } from 'expo';

// expo-file-system comes with expo, but load it lazily so a build without its native module
// shows an error on these buttons instead of crashing the sidebar
function fileSystem(): typeof import('expo-file-system') {
  if (!requireOptionalNativeModule('FileSystem')) {
    throw new Error("This build can't save or open files. Use Copy and Paste instead.");
  }
  return require('expo-file-system');
}

// The pickers reject when the user backs out without choosing anything
const isPickerCancel = (e: unknown) => e instanceof Error && /cancel/i.test(e.message);

/** Asks for a folder and writes the backup there; returns false if the user cancelled */
export async function saveBackupFile(json: string, fileName: string): Promise<boolean> {
  const { Directory } = fileSystem();
  let folder: InstanceType<typeof Directory>;
  try {
    folder = await Directory.pickDirectoryAsync();
  } catch (e) {
    if (isPickerCancel(e)) return false;
    throw e;
  }
  folder.createFile(fileName, 'application/json').write(json);
  return true;
}

/** Asks for a backup file and returns its text, or null if the user cancelled */
export async function pickBackupFile(): Promise<string | null> {
  const { File } = fileSystem();
  try {
    const picked = await File.pickFileAsync(undefined, 'application/json');
    const file = Array.isArray(picked) ? picked[0] : picked;
    return file ? await file.text() : null;
  } catch (e) {
    if (isPickerCancel(e)) return null;
    throw e;
  }
}

/** Keeps the data an import is about to replace, in case the wrong backup was picked */
export function saveSafetyCopy(json: string): void {
  const { File, Paths } = fileSystem();
  const file = new File(Paths.document, 'lyricsionary-before-import.json');
  if (file.exists) file.delete();
  file.create();
  file.write(json);
}
