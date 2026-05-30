---
name: setup-maestro
description: Complete guide for setting up Maestro mobile UI testing framework with GitHub Actions CI/CD integration for React Native and Expo apps.
version: 1.0.0
license: MIT
---

# Setup Maestro for Mobile UI Testing

This guide covers setting up Maestro, a mobile UI testing framework, for automated testing of React Native and Expo apps with GitHub Actions integration.

## What is Maestro?

[Maestro](https://maestro.mobile.dev/) is a simple, declarative mobile UI testing framework. Write tests in YAML that run on iOS and Android simulators/emulators or real devices.

## What You'll Get

- **Declarative YAML tests** - Easy-to-write, maintainable test flows
- **GitHub Actions integration** - Automated testing on PRs
- **Self-hosted runner support** - Run tests on your own hardware
- **Comment-triggered tests** - Run tests via `/maestro` comment on PRs
- **Test result reporting** - Automatic PR comments with pass/fail status

## Prerequisites

- React Native or Expo app
- Android emulator configured (for Android tests)
- Xcode and iOS simulator (for iOS tests)
- GitHub repository

## Step 1: Install Maestro CLI

### macOS/Linux

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### Verify Installation

```bash
maestro --version
```

### Add to PATH

Add to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
export PATH="$PATH:$HOME/.maestro/bin"
```

## Step 2: Create Maestro Test Directory

Create `.maestro/` directory in your project root:

```bash
mkdir -p .maestro
```

## Step 3: Create Test Flows

### 3.1 Launch Flow (Reusable)

For Expo dev client apps, create `.maestro/00-launch-app.yaml`:

```yaml
appId: com.yourcompany.yourapp
---
# Launches the app via Expo dev client deep link
# Requires Metro bundler running (npx expo start)
# For Android emulator, 10.0.2.2 maps to host localhost

- clearState: com.yourcompany.yourapp
- openLink: "exp+yourapp://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081?disableOnboarding=1"

- assertVisible: "Home" # Replace with text visible on your home screen
```

**Key points:**
- `clearState` clears app data before each test
- `openLink` opens the Expo dev client deep link
- `10.0.2.2` is the Android emulator's address for host machine's localhost
- Replace `exp+yourapp` with your app's scheme from `app.json`
- Replace `com.yourcompany.yourapp` with your Android package name

For production/release APKs, use `launchApp` instead:

```yaml
appId: com.yourcompany.yourapp
---
- launchApp
- assertVisible: "Home"
```

### 3.2 Example Test Flow

Create `.maestro/01-basic-navigation.yaml`:

```yaml
appId: com.yourcompany.yourapp
---
# Test: Basic navigation flow

- runFlow: 00-launch-app.yaml

- tapOn: "Settings"
- assertVisible: "Settings Screen"

- tapOn: "Back"
- assertVisible: "Home"
```

### 3.3 Test Organization by Issues

Organize tests by GitHub issue numbers in `.maestro/issues/`:

```
.maestro/
  00-launch-app.yaml
  config.yaml
  README.md
  issues/
    127-learn-screen-not-stuck-loading.yaml
    129-editor-retains-after-save.yaml
```

Example: `.maestro/issues/127-learn-screen-not-stuck-loading.yaml`

```yaml
appId: com.yourcompany.yourapp
---
# Test: LearnScreen not stuck loading after saving a new song — #127

- runFlow: ../00-launch-app.yaml

- tapOn: "Song Name"
- inputText: "#127 - Not Stuck Loading"
- pressKey: "Back"

- tapOn: "Save"

- assertVisible: "1 lines"
- assertNotVisible: "Loading song..."
```

## Step 4: Create Maestro Config

Create `.maestro/config.yaml`:

```yaml
# Maestro Configuration
# See: https://maestro.mobile.dev/advanced/configuration

# Default app identifier
appId: com.yourcompany.yourapp

flows:
  - "issues/*.yaml"

# Optional: Set default tags for all flows
tags:
  - mobile
  - react-native
  - expo

# Optional: Configure test execution
retries: 0
```

## Step 5: Create Maestro README

Create `.maestro/README.md` with setup instructions:

```markdown
# Maestro Testing for YourApp

This directory contains Maestro test flows for the YourApp mobile app.

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
maestro test .maestro/01-basic-navigation.yaml

# Run with Maestro Studio (interactive mode)
maestro studio
```

## Troubleshooting

### App launches to Expo dev client launcher, not the actual app
- Ensure Metro bundler is running (`pnpm start`)
- The deep link in `00-launch-app.yaml` must match your Metro port (default 8081)

### Tests timing out
- The launch flow waits up to 30 seconds for the app to load from Metro
- First load is slower; subsequent loads are faster due to caching
- Add explicit waits: `- wait: 2000` (milliseconds)

### Element not found
- Check that the text exactly matches what's displayed in the app
- Use Maestro Studio to inspect elements: `maestro studio`
- Consider adding `accessibilityLabel` props to components for more reliable selection

## Resources

- [Maestro Documentation](https://maestro.mobile.dev/)
- [Maestro API Reference](https://maestro.mobile.dev/api-reference/commands)
```

## Step 6: Add npm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test:maestro": "maestro test .maestro",
    "test:maestro:all": "maestro test .maestro",
    "emulator": "$ANDROID_HOME/emulator/emulator -netdelay none -netspeed full -no-snapshot-load -avd maestro_test",
    "emulator:stop": "adb emu kill"
  }
}
```

**Scripts:**
- `test:maestro` - Run all Maestro tests
- `test:maestro:all` - Run all Maestro tests (alternative)
- `emulator` - Start Android emulator (replace `maestro_test` with your AVD name)
- `emulator:stop` - Stop Android emulator

## Step 7: Update .gitignore

Add to `.gitignore`:

```
# Maestro test artifacts
.maestro/tests/
test-results.xml
```

## Step 8: Setup GitHub Actions Workflow

### 8.1 Self-Hosted Runner (Recommended)

For best performance, use a self-hosted runner with an emulator. Create `.github/workflows/maestro-tests.yml`:

```yaml
name: Maestro Tests

on:
  pull_request:
    types: [labeled, synchronize]
  issue_comment:
    types: [created]
  workflow_dispatch:

jobs:
  maestro-test:
    name: Run Maestro Tests
    if: >
      github.event_name == 'workflow_dispatch' ||
      (github.event_name == 'pull_request' && contains(github.event.label.name, 'run maestro tests')) ||
      (github.event_name == 'pull_request' && github.event.action == 'synchronize' && contains(github.event.pull_request.labels.*.name, 'run maestro tests')) ||
      (github.event_name == 'issue_comment' && github.event.comment.user.login == 'YOUR_GITHUB_USERNAME' && github.event.issue.pull_request && startsWith(github.event.comment.body, '/maestro'))
    runs-on: self-hosted
    timeout-minutes: 20
    permissions:
      contents: read
      pull-requests: write
      issues: read
    env:
      ANDROID_HOME: /opt/homebrew/share/android-commandlinetools
      ANDROID_SDK_ROOT: /opt/homebrew/share/android-commandlinetools
      MAESTRO_CLI_NO_ANALYTICS: true
    steps:
      - name: React to comment
        if: github.event_name == 'issue_comment'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.reactions.createForIssueComment({
              comment_id: context.payload.comment.id,
              owner: context.repo.owner,
              repo: context.repo.repo,
              content: 'rocket'
            });

      - name: Get PR number
        if: github.event_name == 'issue_comment'
        id: pr
        uses: actions/github-script@v7
        with:
          result-encoding: string
          script: |
            const { data: pr } = await github.rest.pulls.get({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number
            });
            return pr.number.toString();

      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event_name == 'issue_comment' && github.event.issue.pull_request && format('refs/pull/{0}/head', github.event.issue.number) || '' }}

      - name: Start Emulator (if not running)
        run: |
          if $ANDROID_HOME/platform-tools/adb devices | grep -q "emulator"; then
            echo "Emulator already running"
          else
            pnpm emulator &
            echo "Waiting for emulator to boot..."
            $ANDROID_HOME/platform-tools/adb wait-for-device
            for i in $(seq 1 60); do
              if [ "$($ANDROID_HOME/platform-tools/adb shell getprop sys.boot_completed 2>/dev/null)" = "1" ]; then
                echo "Emulator booted"
                break
              fi
              sleep 2
            done
          fi

      - name: Start Metro bundler (if not running)
        run: |
          if curl -s http://localhost:8081/status | grep -q "running"; then
            echo "Metro already running"
          else
            screen -dmS metro npx expo start --port 8081
            echo "Waiting for Metro..."
            for i in $(seq 1 60); do
              if curl -s http://localhost:8081/status | grep -q "running"; then
                echo "Metro ready"
                break
              fi
              sleep 2
            done
          fi

      - name: Run Maestro Tests
        id: maestro
        run: |
          export PATH="$PATH:$HOME/.maestro/bin"
          maestro test .maestro 2>&1 | tee maestro-output.txt
        continue-on-error: true

      - name: Format Test Results
        if: always()
        id: format-results
        run: |
          RESULTS=$(grep -E '^\[(Passed|Failed)\]' maestro-output.txt || true)
          echo "results<<EOF" >> $GITHUB_OUTPUT
          echo "$RESULTS" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Comment PR with Test Results
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const results = `${{ steps.format-results.outputs.results }}`.trim();
            const lines = results ? results.split('\n').filter(l => l.trim()) : [];
            const passed = lines.filter(l => l.startsWith('[Passed]')).length;
            const failed = lines.filter(l => l.startsWith('[Failed]')).length;
            const icon = failed > 0 ? '❌' : '✅';
            let body = `## <img src="https://maestro.dev/favicon.svg" width="15" height="15"> Maestro Tests: ${icon} ${passed} passed, ${failed} failed\n\n`;
            for (const line of lines) {
              const status = line.startsWith('[Passed]') ? '✅' : '❌';
              body += `- ${status} ${line.replace(/^\[(Passed|Failed)\]\s*/, '')}\n`;
            }
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body
            });
```

### 8.2 GitHub-Hosted Runner (Alternative)

For GitHub-hosted runners with cloud device testing, use Maestro Cloud:

```yaml
name: Maestro Tests (Cloud)

on:
  pull_request:
    types: [labeled]

jobs:
  maestro-cloud:
    name: Run Maestro Cloud Tests
    if: contains(github.event.label.name, 'run maestro tests')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build APK
        run: |
          # Build your APK here
          npx expo export:android

      - name: Run Maestro Cloud Tests
        env:
          MAESTRO_CLOUD_API_KEY: ${{ secrets.MAESTRO_CLOUD_API_KEY }}
        run: |
          curl -Ls "https://get.maestro.mobile.dev" | bash
          export PATH="$PATH:$HOME/.maestro/bin"
          maestro cloud --apiKey $MAESTRO_CLOUD_API_KEY \
            --app ./path/to/app.apk \
            .maestro
```

## Step 9: Configure GitHub Labels

Create this label in your GitHub repository:

- **`run maestro tests`** - Triggers Maestro test workflow

## Step 10: Setup Self-Hosted Runner (Optional)

If using self-hosted runner:

1. **Create Android emulator:**
   ```bash
   # List available system images
   sdkmanager --list

   # Install system image
   sdkmanager "system-images;android-33;google_apis;x86_64"

   # Create AVD
   avdmanager create avd -n maestro_test -k "system-images;android-33;google_apis;x86_64" -d "pixel_5"
   ```

2. **Install GitHub Actions runner:**
   - Go to repository Settings → Actions → Runners
   - Click "New self-hosted runner"
   - Follow the setup instructions for your OS

3. **Configure environment variables** on the runner:
   ```bash
   export ANDROID_HOME=/path/to/android-sdk
   export ANDROID_SDK_ROOT=/path/to/android-sdk
   export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools"
   ```

## Usage

### Running Tests Locally

```bash
# Start emulator
pnpm emulator

# Start Metro bundler
pnpm start

# Run all tests
pnpm test:maestro

# Run specific test
maestro test .maestro/issues/127-learn-screen-not-stuck-loading.yaml

# Interactive mode (debugging)
maestro studio
```

### Running Tests in CI

1. **Add label**: Add `run maestro tests` label to PR
2. **Label triggers**: Tests run when label is added or on subsequent commits
3. **Comment trigger**: Comment `/maestro` on PR to manually trigger tests
4. **View results**: Check PR comments for test results

## Common Maestro Commands

### Interaction Commands

```yaml
- tapOn: "Button Text"           # Tap on element with text
- tapOn:                          # Tap at coordinates
    point: "50%,50%"
- longPressOn: "Element"         # Long press
- inputText: "Hello World"       # Type text
- pressKey: "Enter"              # Press key (Enter, Back, Home, etc.)
- swipe:                         # Swipe gesture
    direction: UP
- scroll                         # Scroll until element visible
- scrollUntilVisible:
    element:
      text: "Item"
```

### Assertion Commands

```yaml
- assertVisible: "Text"          # Assert element is visible
- assertNotVisible: "Text"       # Assert element is not visible
- assertTrue: ${condition}       # Assert condition is true
```

### Wait Commands

```yaml
- wait: 2000                     # Wait 2 seconds
- waitForAnimationToEnd         # Wait for animations
```

### Flow Commands

```yaml
- runFlow: path/to/flow.yaml    # Run another flow
- repeat:                        # Repeat commands
    times: 3
    commands:
      - tapOn: "Next"
```

## Best Practices

1. **Use issue-based test naming** - Name tests after GitHub issue numbers (e.g., `127-feature-name.yaml`)
2. **Keep tests independent** - Each test should work in isolation
3. **Use reusable flows** - Create common flows like `00-launch-app.yaml`
4. **Add explicit waits** - When needed, use `- wait: 1000` to handle loading states
5. **Test on real devices** - Emulators can behave differently than real devices
6. **Prefer accessibilityLabel over testID** - For React Native, use `accessibilityLabel` props for reliable element selection. Maestro can target elements by accessibilityLabel which is more semantic than testID
7. **Keep tests maintainable** - Use clear naming and comments
8. **Run tests frequently** - Add `run maestro tests` label to PRs early

## Troubleshooting

### Maestro Not Found

Ensure Maestro is in your PATH:
```bash
export PATH="$PATH:$HOME/.maestro/bin"
maestro --version
```

### Element Not Found

- Use `maestro studio` to inspect the UI hierarchy
- Check exact text/accessibilityLabel matching
- Add waits for async loading: `- wait: 2000`

### Emulator Not Starting

- Check AVD exists: `emulator -list-avds`
- Verify ANDROID_HOME is set correctly
- Try starting manually: `emulator -avd maestro_test`

### Tests Failing in CI but Passing Locally

- Check environment variables in CI
- Ensure emulator is fully booted before running tests
- Add longer waits for CI environment

### Deep Link Not Working

- Verify scheme in `app.json` matches deep link
- Rebuild app after changing intent filters
- Check Metro bundler is accessible at `10.0.2.2:8081`

## Resources

- [Maestro Documentation](https://maestro.mobile.dev/)
- [Maestro API Reference](https://maestro.mobile.dev/api-reference/commands)
- [Maestro Cloud](https://cloud.mobile.dev/)
- [Maestro Examples](https://github.com/mobile-dev-inc/maestro/tree/main/maestro-test)

## Related PRs

- Initial Maestro setup: DleanJeans/lyricsionary#9
