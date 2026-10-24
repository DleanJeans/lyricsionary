import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

/**
 * useState that's saved to AsyncStorage under `key` and restored on the next app start, for small
 * screen preferences like a sort order. `isValid` drops saved values the screen no longer supports.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
  isValid: (value: unknown) => value is T
): [T, (value: T) => void] {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then((json) => {
        if (cancelled || json === null) return;
        const saved: unknown = JSON.parse(json);
        if (isValid(saved)) setValue(saved);
      })
      .catch((e) => console.error(`Failed to load ${key}`, e));
    return () => {
      cancelled = true;
    };
  }, [key]);

  const update = (next: T) => {
    setValue(next);
    AsyncStorage.setItem(key, JSON.stringify(next)).catch((e) => console.error(`Failed to save ${key}`, e));
  };

  return [value, update];
}
