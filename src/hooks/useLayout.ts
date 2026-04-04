import { useWindowDimensions } from 'react-native';

export const WIDE_BREAKPOINT = 768;
export const SIDE_NAV_WIDTH = 220;
export const MAX_CONTENT_WIDTH = 1200;

export function useIsWide(): boolean {
  const { width } = useWindowDimensions();
  return width >= WIDE_BREAKPOINT;
}
