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

3. **Build and install the app on an emulator**:
   ```bash
   npx expo run:android
   ```

## Running Tests

Tests require a running Metro bundler since they use the Expo dev client deep link to connect.

### 1. Start Metro bundler
```bash
pnpm start
```

### 2. Run tests (in another terminal)
```bash
# Run all tests
pnpm test:maestro

# Run a specific test
maestro test .maestro/01-app-launch.yaml

# Run with Maestro Studio (interactive mode)
pnpm test:maestro:studio
```


### How the launch sub-flow works

All test flows use `runFlow: .maestro/00-launch-app.yaml` instead of `launchApp`. This sub-flow:
1. Opens the Expo dev client deep link (`exp+lyricsionary://expo-development-client/?url=...`)
2. Waits up to 30 seconds for the app to connect to Metro and load

For Android emulators, `10.0.2.2` maps to the host machine's `localhost`, so Metro on port 8081 is reached at `http://10.0.2.2:8081`.

## Running Tests on Different Platforms

### Android Emulator
```bash
# Start emulator, build, and install app
npx expo run:android

# Start Metro
pnpm start

# Run tests
pnpm test:maestro
```

### Physical Android Device
Replace `10.0.2.2` in `00-launch-app.yaml` with your machine's local IP (e.g., `192.168.1.x`).

### Release APK (no Metro needed)
```bash
maestro test --app lyricsionary.apk .maestro
```
When testing with a release APK, replace the `runFlow` in each test with `launchApp` since no dev server is needed.

## Troubleshooting

### App launches to Expo dev client launcher, not the actual app
- Ensure Metro bundler is running (`pnpm start`)
- The deep link in `00-launch-app.yaml` must match your Metro port (default 8081)

### Tests timing out
- The launch sub-flow waits up to 30 seconds for the app to load from Metro
- First load is slower; subsequent loads are faster due to caching
- Add explicit waits: `- wait: 2000` (milliseconds)

### Element not found
- Check that the text exactly matches what's displayed in the app
- Use Maestro Studio to inspect elements: `maestro studio`
- Consider adding testID props to components for more reliable selection

### Connecting to Metro from a physical device
- Find your machine's IP (e.g., `ifconfig` on macOS)
- Update the deep link URL in `00-launch-app.yaml` from `10.0.2.2` to your IP

## Resources

- [Maestro Documentation](https://maestro.mobile.dev/)
- [Maestro API Reference](https://maestro.mobile.dev/api-reference/commands)
- [Maestro Cloud](https://cloud.mobile.dev/) - Cloud-based device testing