# Detox E2E Testing Setup

This project uses [Detox](https://wix.github.io/Detox/) for end-to-end (E2E) testing of the React Native application.

## Overview

Detox is a gray-box end-to-end testing framework for mobile apps. It tests the application while it's running in a real device or simulator, enabling automated UI testing.

## Prerequisites

### For Android Testing
- Android SDK (API level 34 recommended)
- Android Emulator or physical device
- Java JDK 17 or higher

### For iOS Testing
- macOS with Xcode installed
- iOS Simulator
- CocoaPods

## Installation

All testing dependencies are already installed via pnpm. If you need to reinstall:

```bash
pnpm install
```

## Project Structure

```
lyricsionary/
├── e2e/
│   ├── jest.config.js    # Jest configuration for E2E tests
│   ├── app.test.ts       # Sample E2E test suite
│   └── artifacts/        # Test artifacts (screenshots, logs) - gitignored
├── .detoxrc.js          # Detox configuration
└── package.json         # Test scripts
```

## Running Tests

### Android

1. **Build the app for testing:**
   ```bash
   pnpm test:e2e:build
   ```

2. **Start an Android emulator** (or connect a physical device):
   ```bash
   # List available AVDs
   emulator -list-avds

   # Start an emulator
   emulator -avd Pixel_7_API_34
   ```

3. **Run the tests:**
   ```bash
   pnpm test:e2e:android
   ```

### iOS

1. **Build the app for testing:**
   ```bash
   pnpm test:e2e:build:ios
   ```

2. **Run the tests:**
   ```bash
   pnpm test:e2e:ios
   ```

### Quick Test (Default: Android)
```bash
pnpm test:e2e
```

## Writing Tests

Tests are located in the `e2e/` directory and follow this pattern:

```typescript
import { device, element, by, expect as detoxExpect } from 'detox';

describe('Feature Name', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should do something', async () => {
    // Your test code here
    await detoxExpect(element(by.id('myElement'))).toBeVisible();
    await element(by.id('myButton')).tap();
  });
});
```

### Best Practices

1. **Use testID for element identification:**
   ```tsx
   <Button testID="submit-button" onPress={handleSubmit}>Submit</Button>
   ```

2. **Keep tests independent:** Each test should be able to run independently.

3. **Use descriptive test names:** Clearly describe what the test is verifying.

4. **Take screenshots for debugging:**
   ```typescript
   await device.takeScreenshot('test-state');
   ```

## Configurations

The project supports multiple test configurations:

- `android.emu.debug` - Android emulator with debug build
- `android.emu.release` - Android emulator with release build
- `android.attached` - Physical Android device
- `ios.sim.debug` - iOS simulator with debug build
- `ios.sim.release` - iOS simulator with release build

## CI/CD Integration

E2E tests run automatically on pull requests via GitHub Actions. See `.github/workflows/e2e-tests.yml` for the workflow configuration.

The CI workflow:
1. Sets up the environment (pnpm, Node.js, Android SDK)
2. Creates an Android Virtual Device (AVD)
3. Prebuilds the native Android project
4. Builds the app for testing
5. Starts the emulator
6. Runs the E2E tests
7. Uploads test artifacts on failure

## Troubleshooting

### Android Emulator Issues

**Emulator won't start:**
```bash
# Check available emulators
emulator -list-avds

# Create a new AVD if needed
avdmanager create avd -n Pixel_7_API_34 -k "system-images;android-34;google_apis;x86_64" -d pixel_7
```

**App won't install:**
- Make sure the emulator is fully booted
- Try uninstalling the app first: `adb uninstall com.dleanjeans.lyricsionary`

### iOS Simulator Issues

**Build failures:**
```bash
# Clean build artifacts
rm -rf ios/build

# Rebuild
pnpm test:e2e:build:ios
```

### General Debugging

1. **Enable verbose logging:**
   The Jest configuration already has `verbose: true` enabled.

2. **Check Detox logs:**
   Logs are saved to `e2e/artifacts/` when tests fail.

3. **Take screenshots:**
   Add `await device.takeScreenshot('debug-point')` in your tests.

## Expo and Detox

This project uses Expo with Detox. Before running tests, the native projects need to be generated using:

```bash
npx expo prebuild
```

This creates the `ios/` and `android/` directories needed by Detox. These directories are gitignored as they're generated files.

## Resources

- [Detox Documentation](https://wix.github.io/Detox/)
- [Detox with Expo](https://docs.expo.dev/guides/detox/)
- [Jest Matchers](https://wix.github.io/Detox/docs/api/matchers)
- [Detox Actions](https://wix.github.io/Detox/docs/api/actions)

## Adding More Tests

To add more test files:

1. Create a new `.test.ts` file in the `e2e/` directory
2. Follow the test structure shown above
3. Run `pnpm test:e2e` to execute all tests

The test runner will automatically discover and run all `*.test.ts` files in the `e2e/` directory.
