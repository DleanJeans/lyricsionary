# Maestro Testing for Lyricsionary

This directory contains Maestro test flows for the Lyricsionary mobile app.

## What is Maestro?

[Maestro](https://maestro.mobile.dev/) is a mobile UI testing framework that allows you to write simple, declarative tests for your iOS and Android apps using YAML files.

## Prerequisites

1. **Install Maestro CLI**:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

2. **Verify installation**:
   ```bash
   maestro --version
   ```

3. **Set up an Android Emulator or iOS Simulator**:
   - For Android: Use Android Studio's AVD Manager
   - For iOS: Use Xcode Simulator (macOS only)

## Running Tests

### Run all tests
```bash
maestro test .maestro
```

### Run a specific test
```bash
maestro test .maestro/01-app-launch.yaml
```

### Run with Maestro Studio (interactive mode)
```bash
maestro studio
```

## Test Structure

Our test flows are organized as follows:

- **01-app-launch.yaml** - Verifies app launches and basic navigation
- **02-editor-create-lyrics.yaml** - Tests creating new lyrics entries
- **03-editor-add-translation.yaml** - Tests adding translations to lyrics
- **04-lyrics-browse.yaml** - Tests browsing saved lyrics library
- **05-learn-screen.yaml** - Tests the learn screen functionality
- **06-words-screen.yaml** - Tests the words vocabulary screen
- **07-web-screen.yaml** - Tests the integrated web browser
- **08-end-to-end-flow.yaml** - Complete user journey from creation to learning

## Running Tests on Different Platforms

### Android (APK)
```bash
maestro test --app lyricsionary.apk .maestro
```

### iOS (Simulator)
```bash
maestro test --app Lyricsionary.app .maestro
```

### With Expo Go (Development)
```bash
# Start Expo
pnpm start

# In another terminal, run Maestro tests
maestro test .maestro
```

## Continuous Integration

Maestro tests can be integrated into CI/CD pipelines. See `.github/workflows/maestro-tests.yml` for GitHub Actions integration.

### CI Environment Variables
- `MAESTRO_CLOUD_API_KEY` - Required for Maestro Cloud testing

## Writing New Tests

1. Create a new `.yaml` file in this directory
2. Start with the app configuration:
   ```yaml
   appId: com.dleanjeans.lyricsionary
   ---
   ```
3. Add test commands following [Maestro's documentation](https://maestro.mobile.dev/api-reference/commands)

### Common Commands
- `launchApp` - Launch the app
- `tapOn: "text"` - Tap on element with text
- `inputText: "text"` - Input text into focused field
- `assertVisible: "text"` - Assert element is visible
- `back` - Navigate back
- `scroll` - Scroll the screen

## Troubleshooting

### App not found
- Ensure the app is installed on the emulator/simulator
- For Android: Check that the package name matches `com.dleanjeans.lyricsionary`
- Build and install the app first using `eas build` or `expo run:android`

### Tests timing out
- Increase wait times with `- waitForAnimationToEnd`
- Add explicit waits: `- wait: 2000` (milliseconds)

### Element not found
- Check that the text exactly matches what's displayed in the app
- Use Maestro Studio to inspect elements: `maestro studio`
- Consider adding testID props to components for more reliable selection

## Resources

- [Maestro Documentation](https://maestro.mobile.dev/)
- [Maestro API Reference](https://maestro.mobile.dev/api-reference/commands)
- [Maestro Cloud](https://cloud.mobile.dev/) - Cloud-based device testing
