import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import { asciiBytes, base64Url, sha256 } from '../utils/sha256';

/**
 * Spotify's Web API, signed in with PKCE (no client secret): what's playing, and seeking within
 * it. Uses Lyricsionary's own Spotify app unless the user pastes their own app's client ID in the
 * sidebar.
 * Seeking and playing need Spotify Premium.
 */

const CLIENT_ID_KEY = '@lyricsionary_spotify_client_id';
/** Lyricsionary's app at developer.spotify.com; PKCE needs no secret, so this is safe to ship */
export const DEFAULT_SPOTIFY_CLIENT_ID = '6636d3a1fd7c4a32a287f2afe619ad88';
const AUTH_KEY = '@lyricsionary_spotify_auth';
const PENDING_KEY = '@lyricsionary_spotify_pending';
const SCOPE = 'user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative';
const API = 'https://api.spotify.com/v1';

interface SpotifyAuth {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  /** What the sign-in allowed; private playlists need a sign-in from after they were added */
  scope?: string;
}

export interface SpotifyPlayback {
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  trackName: string;
  artists: string;
  /** When progressMs was read, to move it along between polls */
  readAt: number;
}

export class SpotifyError extends Error {
  constructor(
    readonly kind: 'signed-out' | 'premium' | 'no-device' | 'not-found' | 'rate-limit' | 'failed',
    message: string
  ) {
    super(message);
  }
}

/** Where Spotify sends the sign-in back to: this app's scheme, or the web page's own address */
export function spotifyRedirectUri(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/spotify-callback`;
  return `${Constants.expoConfig?.scheme ?? 'lyricsionary'}://spotify-callback`;
}

export const isSpotifyCallback = (url: string) => url.includes('spotify-callback');

export async function getSpotifyClientId(): Promise<string> {
  return (
    (await AsyncStorage.getItem(CLIENT_ID_KEY))?.trim() ||
    process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID?.trim() ||
    DEFAULT_SPOTIFY_CLIENT_ID
  );
}

/** Saves the user's own app's client ID; blank goes back to Lyricsionary's app */
export const setSpotifyClientId = (clientId: string) =>
  clientId.trim() ? AsyncStorage.setItem(CLIENT_ID_KEY, clientId.trim()) : AsyncStorage.removeItem(CLIENT_ID_KEY);

/** The client ID the user pasted, or '' when using Lyricsionary's app */
export const getCustomSpotifyClientId = async () => ((await AsyncStorage.getItem(CLIENT_ID_KEY)) ?? '').trim();

export async function isSpotifyConnected(): Promise<boolean> {
  return !!(await AsyncStorage.getItem(AUTH_KEY));
}

export const signOutOfSpotify = () => AsyncStorage.removeItem(AUTH_KEY);

const randomString = (length: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

/** Opens Spotify's sign-in page; it comes back through completeSpotifySignIn */
export async function startSpotifySignIn(): Promise<void> {
  const clientId = await getSpotifyClientId();
  if (!clientId) throw new SpotifyError('signed-out', 'Paste your Spotify client ID first.');
  const verifier = randomString(64);
  const state = randomString(16);
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ verifier, state }));
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: spotifyRedirectUri(),
    code_challenge_method: 'S256',
    code_challenge: base64Url(sha256(asciiBytes(verifier))),
    scope: SCOPE,
    state,
  });
  await Linking.openURL(`https://accounts.spotify.com/authorize?${params.toString()}`);
}

const queryOf = (url: string) => new URLSearchParams(url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '');

async function saveTokens(response: Response, refreshToken?: string, previousScope?: string): Promise<SpotifyAuth> {
  if (!response.ok) throw new SpotifyError('failed', `Spotify sign-in failed (${response.status}).`);
  const body = await response.json();
  const auth: SpotifyAuth = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? refreshToken,
    // A minute early, so a token doesn't run out mid-request
    expiresAt: Date.now() + (body.expires_in - 60) * 1000,
    scope: body.scope ?? previousScope,
  };
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  return auth;
}

/** Finishes signing in from the redirect URL; true once signed in */
export async function completeSpotifySignIn(url: string): Promise<boolean> {
  const query = queryOf(url);
  const pending = JSON.parse((await AsyncStorage.getItem(PENDING_KEY)) ?? 'null');
  const code = query.get('code');
  if (!pending || !code || query.get('state') !== pending.state) return false;
  await AsyncStorage.removeItem(PENDING_KEY);
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: await getSpotifyClientId(),
      grant_type: 'authorization_code',
      code,
      redirect_uri: spotifyRedirectUri(),
      code_verifier: pending.verifier,
    }).toString(),
  });
  await saveTokens(response);
  return true;
}

async function accessToken(): Promise<string> {
  const auth: SpotifyAuth | null = JSON.parse((await AsyncStorage.getItem(AUTH_KEY)) ?? 'null');
  if (!auth) throw new SpotifyError('signed-out', 'Connect Spotify in the sidebar.');
  if (Date.now() < auth.expiresAt) return auth.accessToken;
  if (!auth.refreshToken) throw new SpotifyError('signed-out', 'Connect Spotify again in the sidebar.');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: await getSpotifyClientId(),
      grant_type: 'refresh_token',
      refresh_token: auth.refreshToken,
    }).toString(),
  });
  if (response.status === 400 || response.status === 401) {
    await signOutOfSpotify();
    throw new SpotifyError('signed-out', 'Connect Spotify again in the sidebar.');
  }
  return (await saveTokens(response, auth.refreshToken, auth.scope)).accessToken;
}

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (response.ok || response.status === 204) return response;
  if (response.status === 401) {
    await signOutOfSpotify();
    throw new SpotifyError('signed-out', 'Connect Spotify again in the sidebar.');
  }
  if (response.status === 403) throw new SpotifyError('premium', 'Seeking needs Spotify Premium.');
  if (response.status === 404) throw new SpotifyError('no-device', 'Start Spotify on a device first.');
  if (response.status === 429) throw new SpotifyError('rate-limit', 'Spotify asked to slow down. Try again in a moment.');
  throw new SpotifyError('failed', `Spotify didn't respond (${response.status}).`);
}

/** What Spotify is playing, or null when nothing is */
export async function getSpotifyPlayback(): Promise<SpotifyPlayback | null> {
  const response = await api('/me/player?additional_types=track');
  if (response.status === 204) return null;
  const body = await response.json();
  if (!body?.item) return null;
  return {
    isPlaying: !!body.is_playing,
    progressMs: body.progress_ms ?? 0,
    durationMs: body.item.duration_ms ?? 0,
    trackName: body.item.name ?? '',
    artists: (body.item.artists ?? []).map((a: { name: string }) => a.name).join(', '),
    readAt: Date.now(),
  };
}

export async function seekSpotify(positionMs: number): Promise<void> {
  await api(`/me/player/seek?position_ms=${Math.max(0, Math.round(positionMs))}`, { method: 'PUT' });
}

export async function pauseSpotify(): Promise<void> {
  await api('/me/player/pause', { method: 'PUT' });
}

export async function resumeSpotify(): Promise<void> {
  await api('/me/player/play', { method: 'PUT' });
}

/** The song's Spotify track URI: by title and artist, then by a looser search */
export async function findSpotifyTrackUri(songName: string, artistName: string): Promise<string> {
  const queries = artistName ? [`track:${songName} artist:${artistName}`, `${songName} ${artistName}`] : [songName];
  for (const q of queries) {
    const search = await api(`/search?type=track&limit=1&q=${encodeURIComponent(q)}`);
    const uri = (await search.json())?.tracks?.items?.[0]?.uri;
    if (uri) return uri;
  }
  throw new SpotifyError('not-found', `Couldn't find ${songName} on Spotify.`);
}

interface SpotifyDevice {
  id: string;
  isActive: boolean;
  type: string;
}

/** The devices Spotify is open on, even ones not playing yet */
export async function getSpotifyDevices(): Promise<SpotifyDevice[]> {
  const body: any = await (await api('/me/player/devices')).json();
  return (body?.devices ?? [])
    .filter((d: any) => d?.id && !d.is_restricted)
    .map((d: any) => ({ id: d.id, isActive: !!d.is_active, type: d.type ?? '' }));
}

/** Plays a track; with no active device, on the device Spotify is open on (this phone first) */
export async function playSpotifyTrack(uri: string, positionMs = 0): Promise<void> {
  const body = JSON.stringify({ uris: [uri], position_ms: Math.round(positionMs) });
  try {
    await api('/me/player/play', { method: 'PUT', body });
  } catch (e) {
    if (!(e instanceof SpotifyError) || e.kind !== 'no-device') throw e;
    const devices = await getSpotifyDevices();
    const device =
      devices.find((d) => d.isActive) ??
      devices.find((d) => d.type.toLowerCase() === (Platform.OS === 'web' ? 'computer' : 'smartphone')) ??
      devices[0];
    if (!device) throw e;
    await api(`/me/player/play?device_id=${encodeURIComponent(device.id)}`, { method: 'PUT', body });
  }
}

/** Opens a track in the Spotify app, or on open.spotify.com without it */
export async function openSpotifyTrack(uri: string): Promise<void> {
  const web = `https://open.spotify.com/track/${uri.split(':').pop()}`;
  if (Platform.OS === 'web') {
    window.open(web, '_blank');
    return;
  }
  try {
    await Linking.openURL(uri);
  } catch {
    await Linking.openURL(web);
  }
}

/** Finds the song on Spotify and plays it from a position */
export async function playSongOnSpotify(songName: string, artistName: string, positionMs = 0): Promise<void> {
  await playSpotifyTrack(await findSpotifyTrackUri(songName, artistName), positionMs);
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  trackCount: number;
}

export interface SpotifyTrack {
  name: string;
  /** Every artist, joined with ", " like the playback */
  artists: string;
}

/** Whether the sign-in can read private playlists; a sign-in from before they were added can't */
export async function canReadPrivatePlaylists(): Promise<boolean> {
  const auth: SpotifyAuth | null = JSON.parse((await AsyncStorage.getItem(AUTH_KEY)) ?? 'null');
  return !!auth?.scope?.includes('playlist-read-private');
}

/** The user's playlists, their own and followed ones */
export async function getSpotifyPlaylists(): Promise<SpotifyPlaylist[]> {
  const playlists: SpotifyPlaylist[] = [];
  let path: string | null = '/me/playlists?limit=50';
  while (path && playlists.length < 200) {
    const body: any = await (await api(path)).json();
    for (const item of body?.items ?? []) {
      if (item?.id) playlists.push({ id: item.id, name: item.name ?? '', trackCount: item.tracks?.total ?? 0 });
    }
    path = body?.next ? body.next.replace(API, '') : null;
  }
  return playlists;
}

/** A playlist's songs, up to 500 */
export async function getSpotifyPlaylistTracks(id: string): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  let path: string | null = `/playlists/${id}/tracks?limit=100&fields=next,items(track(name,artists(name)))`;
  while (path && tracks.length < 500) {
    const body: any = await (await api(path)).json();
    for (const item of body?.items ?? []) {
      if (!item?.track?.name) continue;
      tracks.push({ name: item.track.name, artists: (item.track.artists ?? []).map((a: { name: string }) => a.name).join(', ') });
    }
    path = body?.next ? body.next.replace(API, '') : null;
  }
  return tracks;
}

export const spotifyErrorMessage = (error: unknown) =>
  error instanceof SpotifyError ? error.message : 'Something went wrong talking to Spotify.';
