import { device, element, by, expect as detoxExpect, waitFor } from 'detox';


describe('#127 - Learn screen not stuck loading after save', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('should save a new song from Editor', async () => {
    await element(by.id('song-name-input')).typeText('#127 - Not Stuck Loading');
    await element(by.text('Save')).tap();
  });

  it('should show song on Learn screen without stuck loading', async () => {
    await detoxExpect(element(by.id('song-name-display'))).toHaveText('#127 - Not Stuck Loading');
    await detoxExpect(element(by.id('loading-song'))).not.toBeVisible();
  });
});

describe('#129 - Editor retains state after save', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true });
  });

  it('should save a new song and retain it in Editor', async () => {
    await element(by.id('song-name-input')).typeText('#129 - Editor Retains');
    await element(by.text('Save')).tap();

    await element(by.text('Editor')).tap();
    await detoxExpect(element(by.text('#129 - Editor Retains'))).toBeVisible();
  });
});