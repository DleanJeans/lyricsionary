import { detectSongSections, formatSongSections } from '../src/utils/songSections';

const lyrics = (...stanzas: string[][]) => stanzas.map((stanza) => stanza.join('\n')).join('\n\n').split('\n');
const labels = (lines: string[]) => detectSongSections(lines).map((section) => section.label);

const intro = ['Oh-oh', 'Yeah'];
const verse1 = ['I walked along the river', 'The water running cold', 'I never said a word to you', 'The story never told'];
const verse2 = ['The morning came too early', 'The coffee lost its taste', 'You left a note beside the door', 'And vanished without trace'];
const preChorus = ['And now I know', 'There is nowhere left to go'];
const chorus = ['So hold me tonight', 'Hold me till the light', 'Don\'t let me go', 'Hold me tonight'];
const bridge = ['Maybe in another life', 'We could make it right', 'Maybe in another time', 'You would still be mine'];
const outro = ['Hold me', 'Hold me'];

describe('detectSongSections', () => {
  it('labels a pop song by what repeats', () => {
    expect(labels(lyrics(intro, verse1, preChorus, chorus, verse2, preChorus, chorus, bridge, chorus, outro))).toEqual([
      'Intro', 'Verse 1', 'Pre-Chorus', 'Chorus', 'Verse 2', 'Pre-Chorus', 'Chorus', 'Bridge', 'Chorus', 'Outro',
    ]);
  });

  it('keeps the line ranges of each stanza', () => {
    const sections = detectSongSections(lyrics(verse1, chorus, verse2, chorus));
    expect(sections.map(({ start, end }) => [start, end])).toEqual([[0, 3], [5, 8], [10, 13], [15, 18]]);
  });

  it('splits a stanza where the chorus starts without a blank line', () => {
    const sections = detectSongSections(lyrics([...verse1, ...chorus], [...verse2, ...chorus]));
    expect(sections.map((s) => [s.label, s.start, s.end])).toEqual([
      ['Verse 1', 0, 3], ['Chorus', 4, 7], ['Verse 2', 9, 12], ['Chorus', 13, 16],
    ]);
  });

  it('matches a chorus with a changed line or sung twice', () => {
    const changed = [...chorus.slice(0, 3), 'Hold me forever'];
    expect(labels(lyrics(verse1, chorus, verse2, changed, [...chorus, ...chorus]))).toEqual([
      'Verse 1', 'Chorus', 'Verse 2', 'Chorus', 'Chorus',
    ]);
  });

  it('ignores punctuation, case and repeat markers', () => {
    const shouted = chorus.map((line) => `${line.toUpperCase()}!`);
    shouted[3] += ' (x2)';
    expect(labels(lyrics(verse1, chorus, verse2, shouted))).toEqual(['Verse 1', 'Chorus', 'Verse 2', 'Chorus']);
  });

  it('calls a short part repeated outside the chorus a hook', () => {
    const hook = ['Na na na', 'Hey hey hey'];
    expect(labels(lyrics(verse1, chorus, hook, verse2, chorus, hook))).toEqual([
      'Verse 1', 'Chorus', 'Hook', 'Verse 2', 'Chorus', 'Hook',
    ]);
  });

  it('labels plain verses when nothing repeats', () => {
    expect(labels(lyrics(verse1, verse2))).toEqual(['Verse 1', 'Verse 2']);
  });

  it('returns nothing for a single stanza', () => {
    expect(detectSongSections(verse1)).toEqual([]);
    expect(detectSongSections([])).toEqual([]);
  });
});

describe('formatSongSections', () => {
  it('tags each section with its label', () => {
    expect(formatSongSections(lyrics(verse1, chorus, verse2, chorus))).toBe(
      ['[Verse 1]', ...verse1, '', '[Chorus]', ...chorus, '', '[Verse 2]', ...verse2, '', '[Chorus]', ...chorus].join('\n')
    );
  });
});
