import { device, element, by, expect as detoxExpect } from 'detox';

describe('App Launch', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should launch the app successfully', async () => {
  });

  it('should display the navigation tabs', async () => {
  });
});