import { device, element, by, expect as detoxExpect } from 'detox';

describe('App Launch', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should launch the app successfully', async () => {
    await device.takeScreenshot('app-launched');
  });

  it('should display the navigation tabs', async () => {
    await device.takeScreenshot('navigation-tabs');
  });
});