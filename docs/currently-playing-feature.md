# Currently Playing Song Reader Feature

## Overview
This feature allows users to automatically fill in song name and artist name fields in the Editor screen by reading information from currently playing media on their Android device (Spotify, YouTube, etc.).

## UI Location
- **Screen**: EditorScreen
- **Button**: Musical note icon button in the header (top right)
- **Icon**: `musical-note` from Ionicons

## How It Works

### Technical Implementation
1. **Package Used**: `react-native-nitro-notification-listener`
2. **Background Listener**: Starts automatically when the app loads
3. **Media Apps Supported**:
   - Spotify
   - YouTube / YouTube Music
   - Amazon Music
   - Apple Music
   - Deezer
   - SoundCloud
   - Tidal
   - Pandora

### User Flow
1. User taps the musical note icon in EditorScreen
2. If notification permission not granted:
   - Alert asks user to grant permission
   - "Open Settings" button takes user to Android Settings
   - User must manually enable notification access for Lyricsionary
3. If permission granted but no media playing:
   - Alert: "No Media Playing" with instructions
4. If permission granted and media is playing:
   - Song name and artist name fields are automatically filled
   - Success alert is shown

### Permissions Required
- `BIND_NOTIFICATION_LISTENER_SERVICE` (Android)
- Must be manually enabled by user in Settings → Apps → Special Access → Notification Access

## Files Modified
- `/src/screens/EditorScreen.tsx` - Added button handler and UI integration
- `/src/services/mediaNotification.ts` - Service layer for reading media info
- `/app.json` - Added Android permission

## Build Requirements
This feature requires a custom development build (not Expo Go):
```bash
npx expo prebuild
npx expo run:android
```

Any commits that modify this feature or related Android configurations should include `[build-apk]` tag in the commit message.

## Limitations
1. **Android Only** - iOS doesn't allow reading other apps' media information
2. **Manual Permission** - Users must manually enable notification access in Settings
3. **Background Service** - Works best when listener is running in background
4. **App-Specific** - Some media apps may not populate all metadata fields
5. **Accuracy** - Relies on notification format (title = song, text = artist)

## Future Improvements
- Extract richer metadata using MediaController API
- Support for album name, duration, playback state
- Better handling of different notification formats
- Persistent storage of permission state
- In-app permission status indicator
