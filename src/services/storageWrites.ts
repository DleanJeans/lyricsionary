import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage has no transaction primitive. Serialize writes so a slower
// earlier operation cannot finish after and overwrite a newer in-memory state.
let storageWriteQueue: Promise<void> = Promise.resolve();

/**
 * How long a write waits, so a tap's change is drawn first and turning its data (thousands of saved
 * words) into text doesn't hold the screen up; changes to the same key in the meantime are written once
 */
const WRITE_DELAY_MS = 400;

const pending = new Map<string, { serialize: () => string; waiters: { resolve: () => void; reject: (e: unknown) => void }[] }>();
let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * Saves a value under a key a moment later, with the latest value given for the key by then. Pass a
 * function to turn the value into text only when it's written. Resolves once it's written.
 */
export function persist(key: string, value: string | (() => string)): Promise<void> {
  return new Promise((resolve, reject) => {
    const waiters = pending.get(key)?.waiters ?? [];
    waiters.push({ resolve, reject });
    pending.set(key, { serialize: typeof value === 'string' ? () => value : value, waiters });
    if (!timer) timer = setTimeout(flushWrites, WRITE_DELAY_MS);
  });
}

/** Writes every waiting value now, e.g. before a backup reads storage or the app goes to the background */
export function flushWrites(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  const writes = [...pending].map(([key, { serialize, waiters }]) => {
    const write = storageWriteQueue.then(() => AsyncStorage.setItem(key, serialize()));
    storageWriteQueue = write.catch(() => {});
    write.then(
      () => waiters.forEach((w) => w.resolve()),
      (e) => waiters.forEach((w) => w.reject(e))
    );
    return write.catch(() => {});
  });
  pending.clear();
  return Promise.all(writes).then(() => {});
}
