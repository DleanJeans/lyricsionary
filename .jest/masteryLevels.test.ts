import { toMasteryLevel } from '../src/types';

describe('toMasteryLevel', () => {
  it('renames the old levels', () => {
    expect(toMasteryLevel(undefined)).toBe('Seen');
    expect(toMasteryLevel('Unknown')).toBe('Seen');
    expect(toMasteryLevel('New')).toBe('Seen');
    expect(toMasteryLevel('Learning')).toBe('Recognized');
    expect(toMasteryLevel('Mastered')).toBe('Known');
  });

  it('keeps the new levels', () => {
    for (const level of ['Seen', 'Recognized', 'Recalled', 'Known']) expect(toMasteryLevel(level)).toBe(level);
  });
});
