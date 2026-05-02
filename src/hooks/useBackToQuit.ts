import { useEffect, useRef } from 'react';
import { BackHandler, ToastAndroid, Platform } from 'react-native';

/**
 * Hook to handle "back to quit" functionality on Android.
 * Shows a toast on first back press, quits on second back press while toast is visible.
 *
 * @param enabled - Whether the hook should be active
 */
export function useBackToQuit(enabled: boolean = true) {
  const backPressedOnce = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (backPressedOnce.current) {
        // Second press - allow default behavior (exit app)
        return false;
      }

      // First press - show toast and prevent exit
      backPressedOnce.current = true;
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);

      // Reset after 2 seconds
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        backPressedOnce.current = false;
      }, 2000) as unknown as number;

      return true; // Prevent default behavior
    });

    return () => {
      backHandler.remove();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled]);
}
