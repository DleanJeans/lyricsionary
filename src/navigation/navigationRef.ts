import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootTabParamList } from '../types';

/** The app's navigation, for opening screens from outside one, e.g. the review shown when the app opens */
export const navigationRef = createNavigationContainerRef<any>();

/** Opens a word's Look Up page in the tabs, from anywhere */
export function openWordLookup(params: NonNullable<RootTabParamList['WordLookup']>) {
  if (!navigationRef.isReady()) return;
  const nav = navigationRef as any;
  if (navigationRef.getRootState()?.routeNames.includes('Tabs')) nav.navigate('Tabs', { screen: 'WordLookup', params });
  else nav.navigate('WordLookup', params);
}

/** Opens a song in Learn at one of its lines, from anywhere */
export function openSongAtLine(songId: string, focus: { word?: string; line: string; occurrence?: number }) {
  if (!navigationRef.isReady()) return;
  const nav = navigationRef as any;
  if (navigationRef.getRootState()?.routeNames.includes('Tabs')) nav.navigate('Tabs', { screen: 'Learn', params: { songId, focus } });
  else nav.navigate('Learn', { songId, focus });
}
