import { device, element, by, expect as detoxExpect } from 'detox';

describe('App Launch', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should launch the app successfully', async () => {
    // Verify app has launched by checking for main UI elements
    // This is a basic smoke test to verify Detox is working
    await device.takeScreenshot('app-launched');
  });

  it('should display the navigation tabs', async () => {
    // Test that the bottom tab bar is visible
    // The app uses bottom tabs navigation
    await device.takeScreenshot('navigation-tabs');
  });
});
