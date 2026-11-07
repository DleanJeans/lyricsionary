import { shortAudioLabel, shortAudioLabels } from '../src/utils/audioLabels';

describe('shortAudioLabel', () => {
  it('turns a country into its code, dropping the city', () => {
    expect(shortAudioLabel('Austria')).toBe('AT');
    expect(shortAudioLabel('Germany (Berlin)')).toBe('DE');
    expect(shortAudioLabel('US')).toBe('US');
    expect(shortAudioLabel('Received Pronunciation')).toBe('RP');
  });

  it('keeps a short unknown label and cuts a long one', () => {
    expect(shortAudioLabel('Bavaria')).toBe('Bavaria');
    expect(shortAudioLabel('Hamburg Hochdeutsch')).toBe('Hamburg');
    expect(shortAudioLabel('Niederösterreich')).toBe('Niederö…');
  });
});

describe('shortAudioLabels', () => {
  it('numbers labels that shorten the same', () => {
    expect(shortAudioLabels(['Germany', 'Germany (Berlin)', 'Austria'])).toEqual(['DE', 'DE 2', 'AT']);
  });

  it('gives recordings with no accent no label', () => {
    expect(shortAudioLabels(['', 'Germany'])).toEqual(['', 'DE']);
    expect(shortAudioLabels(['', ''])).toEqual(['', '']);
  });
});
