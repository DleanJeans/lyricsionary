import { NavigationContext } from '@react-navigation/native';
import { useContext, useEffect, useReducer, useRef } from 'react';
import { useStore } from '../store/useStore';

type StoreState = ReturnType<typeof useStore.getState>;

/**
 * useStore for a screen that's out of sight most of the time, like Songs or Words while Learn is open:
 * its value stays as it was while another screen is shown, so saving or ignoring a word in Learn doesn't
 * count every song's words again behind it. The screen catches up once it's shown again. Outside a
 * screen (no navigation), it's just useStore.
 */
export function useStoreWhileShown<T>(selector: (state: StoreState) => T): T {
  const navigation = useContext(NavigationContext);
  const shown = useRef<boolean | null>(null);
  if (shown.current === null) shown.current = navigation?.isFocused() ?? true;
  const kept = useRef<{ value: T } | null>(null);
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const [, refresh] = useReducer((n: number) => n + 1, 0);

  const value = useStore((state) => {
    if (shown.current || !kept.current) kept.current = { value: selector(state) };
    return kept.current.value;
  });

  useEffect(() => {
    if (!navigation) return;
    const offFocus = navigation.addListener('focus', () => {
      shown.current = true;
      if (kept.current && selectorRef.current(useStore.getState()) !== kept.current.value) refresh();
    });
    const offBlur = navigation.addListener('blur', () => {
      shown.current = false;
    });
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);

  return value;
}
