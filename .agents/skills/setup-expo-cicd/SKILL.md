---
name: setup-expo-cicd
description: Complete guide for setting up Expo Application Services (EAS) CI/CD with GitHub Actions for automated builds, OTA updates, deep linking, and expo-updates integration.
version: 1.0.0
license: MIT
---

# Setup Expo CI/CD with EAS

This guide covers setting up a complete CI/CD pipeline for Expo apps using EAS (Expo Application Services) with GitHub Actions.

## What You'll Get

- **OTA (Over-The-Air) Updates**: Instant updates via expo-updates without rebuilding the app
- **Automated APK Builds**: Local APK builds on GitHub Actions
- **Deep Linking**: Support for Expo development client deep links
- **Label-Based Triggers**: Control builds and updates with PR labels
- **GitHub Releases**: Automatic release creation with APK artifacts

## Prerequisites

- Expo project with `expo-dev-client` installed
- GitHub repository
- EAS account (sign up at https://expo.dev)
- `EXPO_TOKEN` secret configured in GitHub repository settings

## Required Packages

Install these dependencies in your project:

```bash
pnpm add expo-updates expo-dev-client expo-constants
pnpm add -D @expo/config-plugins
```

**Key packages:**
- `expo-updates@^55.0.21` - OTA update runtime
- `expo-dev-client@~55.0.30` - Development builds
- `expo-constants@^55.0.15` - Access to app.json config
- `@expo/config-plugins@^55.0.8` - Config plugins (devDependency)

## Step 1: Configure EAS

### 1.1 Create `eas.json`

```json
{
  "cli": {
    "version": ">= 18.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "channel": "preview"
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**Build profiles:**
- `development` - For development builds with dev client (APK)
- `preview` - For PR preview builds (APK)
- `production` - For production releases (app-bundle for Play Store)

### 1.2 Update `app.json`

Add EAS project configuration:

```json
{
  "expo": {
    "name": "YourApp",
    "slug": "yourapp",
    "scheme": "exp+yourapp",
    "updates": {
      "url": "https://u.expo.dev/YOUR_PROJECT_ID"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "extra": {
      "eas": {
        "projectId": "YOUR_PROJECT_ID"
      }
    },
    "owner": "your-expo-username",
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp"
    },
    "android": {
      "package": "com.yourcompany.yourapp",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "exp+yourapp"
            }
          ],
          "category": [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    },
    "plugins": [
      "./plugins/withJVMMemory"
    ]
  }
}
```

**Important fields:**
- `scheme` - Deep link scheme for expo-updates (format: `exp+<slug>`)
- `updates.url` - Your EAS updates URL (get from `eas project:info`)
- `runtimeVersion.policy` - Use "appVersion" to tie updates to app version
- `extra.eas.projectId` - Your EAS project ID
- `android.intentFilters` - Android deep link configuration

### 1.3 Create Config Plugin for JVM Memory

Create `plugins/withJVMMemory.js`:

```javascript
const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Expo config plugin to configure Gradle JVM memory settings.
 * This prevents OutOfMemoryError: Metaspace during Kotlin KSP tasks.
 * It also disables the Gradle daemon to prevent zombie processes from hanging the build.
 */
module.exports = function withJVMMemory(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;

    const setGradleProperty = (key, value) => {
      const index = props.findIndex((p) => p.type === 'property' && p.key === key);
      if (index >= 0) {
        props[index].value = value;
      } else {
        props.push({ type: 'property', key, value });
      }
    };

    setGradleProperty(
      'org.gradle.jvmargs',
      '-Xmx3g -XX:MaxMetaspaceSize=2g -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8'
    );
    // Disable the Gradle daemon to prevent zombie daemon processes from hanging
    // the build after an OutOfMemoryError failure
    setGradleProperty('org.gradle.daemon', 'false');

    return config;
  });
};
```

This plugin prevents build failures due to memory issues during local APK builds in CI.

## Step 2: Setup expo-updates in Your App

### 2.1 Create Setup Action (Reusable)

Create `.github/actions/setup/action.yml`:

```yaml
name: Setup Environment
description: Setup Node, pnpm, and Expo for builds and updates
inputs:
  expo-token:
    description: 'Expo token for authentication'
    required: true

runs:
  using: composite
  steps:
    - uses: pnpm/action-setup@v4
      shell: bash

    - uses: actions/setup-node@v4
      with:
        node-version: '22'
        cache: 'pnpm'
      shell: bash

    - name: Setup Expo
      uses: expo/expo-github-action@v8
      with:
        eas-version: latest
        token: ${{ inputs.expo-token }}
      shell: bash

    - name: Install dependencies
      run: pnpm install --frozen-lockfile
      shell: bash
```

### 2.2 Update Your App Entry Point

In your main app file (e.g., `App.tsx`), add expo-updates check:

```tsx
import * as Updates from 'expo-updates';

export default function App() {
  useEffect(() => {
    async function checkForUpdates() {
      try {
        // Only check for updates in production builds
        if (!__DEV__) {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }
        }
      } catch (error) {
        console.log('Error checking for updates:', error);
      }
    }

    checkForUpdates();
  }, []);

  return (
    // Your app content
  );
}
```

### 2.3 Add Deep Link Configuration

Update your navigation container to support deep linking:

```tsx
import { NavigationContainer } from '@react-navigation/native';

const linking = {
  prefixes: ['exp+yourapp://'],
  config: {
    screens: {
      Home: 'home',
      Profile: 'profile/:id?',
      // ... other screens
    },
  },
};

export default function App() {
  return (
    <NavigationContainer linking={linking}>
      {/* Your navigators */}
    </NavigationContainer>
  );
}
```

## Step 3: Create GitHub Actions Workflow

Create `.github/workflows/eas.yml`:

```yaml
name: EAS

on:
  push:
    branches: [main]
  pull_request:
    types: [labeled]
  workflow_dispatch:

jobs:
  check-labels:
    name: Check labels
    runs-on: ubuntu-latest
    outputs:
      should-build-apk: ${{ steps.check.outputs.should-build-apk }}
      should-ota-update: ${{ steps.check.outputs.should-ota-update }}
    steps:
      - name: Check PR labels or merged PR labels
        id: check
        uses: actions/github-script@v7
        with:
          script: |
            let shouldBuildApk = false;
            let shouldOtaUpdate = false;

            if (context.eventName === 'pull_request') {
              // For PR events, check current PR labels
              const labels = context.payload.pull_request.labels.map(label => label.name);
              shouldBuildApk = labels.includes('rebuild apk');
              shouldOtaUpdate = labels.includes('send ota');
              console.log('PR labels:', labels);
            } else if (context.eventName === 'push' && context.ref === 'refs/heads/main') {
              const commits = context.payload.commits || [];

              if (commits.length > 0) {
                const commitMessage = commits[commits.length - 1].message;

                if (commitMessage.toLowerCase().includes('skip-ota')) {
                  console.log('Skipping OTA update: commit message contains skip-ota');
                } else {
                  shouldOtaUpdate = true;

                  const prMatch = commitMessage.match(/#(\d+)/);

                  if (prMatch) {
                    const prNumber = parseInt(prMatch[1]);
                    console.log('Found PR number:', prNumber);

                    try {
                      const { data: pr } = await github.rest.pulls.get({
                        owner: context.repo.owner,
                        repo: context.repo.repo,
                        pull_number: prNumber
                      });

                      const labels = pr.labels.map(label => label.name);
                      if (labels.includes('skip ota')) {
                        console.log('Skipping OTA update: PR has "skip ota" label');
                        shouldOtaUpdate = false;
                      } else {
                        shouldBuildApk = labels.includes('rebuild apk');
                      }
                      console.log('Merged PR labels:', labels);
                    } catch (error) {
                      console.log('Could not fetch PR:', error.message);
                    }
                  }
                }
              }
            } else if (context.eventName === 'workflow_dispatch') {
              // For manual trigger, default to running OTA update
              shouldOtaUpdate = true;
            }

            console.log('Should build APK:', shouldBuildApk);
            console.log('Should OTA update:', shouldOtaUpdate);

            core.setOutput('should-build-apk', shouldBuildApk);
            core.setOutput('should-ota-update', shouldOtaUpdate);

  ota-update:
    name: Send OTA Update
    needs: check-labels
    if: needs.check-labels.outputs.should-ota-update == 'true'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    env:
      npm_config_user_agent: pnpm
    steps:
      - uses: actions/checkout@v4

      - name: Setup environment
        uses: ./.github/actions/setup
        with:
          expo-token: ${{ secrets.EXPO_TOKEN }}

      - name: Send OTA Update (Production)
        if: github.event_name == 'push'
        run: |
          eas update --branch production --message "Production update from commit ${{ github.sha }}"

      - name: Send OTA Update (Development)
        if: github.event_name == 'pull_request'
        id: ota-update
        run: |
          OUTPUT=$(eas update --branch development --platform android --message "PR #${{ github.event.pull_request.number }}: ${{ github.event.pull_request.title }}" --json)
          GROUP_ID=$(echo "$OUTPUT" | jq -r '.[0].group')
          echo "group-id=$GROUP_ID" >> $GITHUB_OUTPUT

      - name: Comment PR with EAS Dashboard Link
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const groupId = '${{ steps.ota-update.outputs.group-id }}';
            const dashboardUrl = groupId
              ? `https://expo.dev/accounts/<YOUR_ACCOUNT>/projects/<YOUR_PROJECT>/updates/${groupId}`
              : `https://expo.dev/accounts/<YOUR_ACCOUNT>/projects/<YOUR_PROJECT>/updates`;
            const comment = `### 🚀 OTA Update sent to [EAS Dashboard](${dashboardUrl})!`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });

  build-apk:
    name: Build APK
    needs: check-labels
    if: github.event_name == 'workflow_dispatch' || needs.check-labels.outputs.should-build-apk == 'true'
    runs-on: ubuntu-latest
    timeout-minutes: 40
    permissions:
      contents: write
      pull-requests: write
    env:
      npm_config_user_agent: pnpm
    steps:
      - uses: actions/checkout@v4

      - name: Setup environment
        uses: ./.github/actions/setup
        with:
          expo-token: ${{ secrets.EXPO_TOKEN }}

      - name: Setup Android SDK
        uses: android-actions/setup-android@v4

      - name: Get build datetime
        id: datetime
        run: echo "datetime=$(date +'%Y%m%d-%H%M%S')" >> $GITHUB_OUTPUT

      - name: Build APK locally
        run: eas build --platform android --profile development --local --non-interactive --output ./yourapp-${{ steps.datetime.outputs.datetime }}.apk

      - name: Upload APK artifact
        if: github.event_name == 'pull_request'
        id: upload-artifact
        uses: actions/upload-artifact@v7
        with:
          name: yourapp-${{ steps.datetime.outputs.datetime }}
          path: ./yourapp-${{ steps.datetime.outputs.datetime }}.apk

      - name: Comment PR with APK download link
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v9
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `### 📦 [APK Ready!](${{ steps.upload-artifact.outputs.artifact-url }})\nCommit: \`${{ github.sha }}\``
            });

      - name: Get version from package.json
        if: github.event_name != 'pull_request'
        id: package-version
        run: echo "version=$(node -p "require('./package.json').version")" >> $GITHUB_OUTPUT

      - name: Create GitHub Release
        if: github.event_name != 'pull_request'
        uses: softprops/action-gh-release@v3
        with:
          tag_name: v${{ steps.package-version.outputs.version }}-build.${{ github.run_number }}
          name: Release v${{ steps.package-version.outputs.version }} (Build ${{ github.run_number }})
          body: |
            ## Android APK Release

            **Version:** ${{ steps.package-version.outputs.version }}
            **Build:** ${{ github.run_number }}
            **Commit:** ${{ github.sha }}

            ### Changes
            ${{ github.event.head_commit.message }}

            Download the APK below to install on Android devices.
          files: ./yourapp-${{ steps.datetime.outputs.datetime }}.apk
          draft: false
          prerelease: false
```

## Step 4: Configure GitHub Labels

Create these labels in your GitHub repository:

- **`send ota`** - Triggers OTA update job (for PRs and main branch merges)
- **`rebuild apk`** - Triggers APK build job (for PRs and main branch merges)
- **`skip ota`** - Skips OTA update even on main branch

## Step 5: Setup EXPO_TOKEN Secret

1. Generate an Expo token:
   ```bash
   eas login
   eas whoami
   eas token:create
   ```

2. Add the token to GitHub:
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `EXPO_TOKEN`
   - Value: Your token from step 1

## Step 6: Initialize EAS Project

```bash
# Login to Expo
eas login

# Initialize EAS project (creates app.json extra.eas.projectId)
eas init

# Configure project
eas project:info
```

## Usage

### For Pull Requests

1. **OTA Update Only**: Add `send ota` label to PR
2. **APK Build Only**: Add `rebuild apk` label to PR
3. **Both**: Add both labels to PR
4. **Skip OTA**: Add `skip ota` label to prevent OTA updates

The workflow runs when labels are added or when PR is synchronized with labels present.

### For Main Branch

- **OTA Update**: Automatically sent on every push (unless commit message contains "skip-ota")
- **APK Build**: Only if merged PR had `rebuild apk` label
- **Skip OTA**: Add `skip ota` label to PR before merging, or include "skip-ota" in commit message

### Manual Trigger

Use workflow dispatch to manually trigger:
- Default: Sends OTA update only
- Builds APK if workflow is dispatched

## Testing Deep Links

After setting up, test your deep link:

```bash
# Example deep link format
exp+yourapp://expo-development-client/?url=https%3A%2F%2Fu.expo.dev%2F<PROJECT_ID>%2Fgroup%2F<GROUP_ID>

# Test on Android (with device/emulator connected)
adb shell am start -a android.intent.action.VIEW -d "exp+yourapp://expo-development-client/?url=https%3A%2F%2Fu.expo.dev%2F<PROJECT_ID>%2Fgroup%2F<GROUP_ID>"
```

## Troubleshooting

### OTA Updates Not Working

1. **Check runtime version**: Ensure `app.json` has `runtimeVersion.policy: "appVersion"`
2. **Verify update URL**: Run `eas project:info` to get correct updates URL
3. **Check channel**: Make sure build profile channel matches update branch
4. **Native changes**: OTA can't update native code - needs new APK build

### APK Build Fails with Memory Error

- The `withJVMMemory` plugin should prevent this
- If it still fails, increase memory in the plugin: `-Xmx4g -XX:MaxMetaspaceSize=3g`

### Deep Link Not Opening App

1. **Verify scheme**: Check `app.json` scheme matches your deep link
2. **Rebuild app**: Intent filters require native rebuild
3. **Test deep link**: Use `adb shell am start` to test on Android

### Updates URL Not Found

1. Run `eas project:info` to get your project details
2. Update `app.json` with correct `updates.url`
3. Format: `https://u.expo.dev/<PROJECT_ID>`

## Best Practices

1. **Use appVersion runtime policy** - Ties updates to app version, preventing incompatible updates
2. **Label-based triggers** - Saves CI minutes by only building/updating when needed
3. **Development channel for PRs** - Keeps preview updates separate from production
4. **Always comment PR with links** - Makes testing easier for reviewers
5. **Test OTA before merging** - Add `send ota` label to PR and test on device

## References

- [Expo Updates Documentation](https://docs.expo.dev/versions/latest/sdk/updates/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Update Documentation](https://docs.expo.dev/eas-update/introduction/)
- [Deep Linking with Expo](https://docs.expo.dev/guides/linking/)

## Related PRs

- Initial CI/CD setup: DleanJeans/lyricsionary#1
- expo-updates + deep links: DleanJeans/lyricsionary#17
- Version display in app: DleanJeans/lyricsionary#23
- Label-based triggers: DleanJeans/lyricsionary#105
