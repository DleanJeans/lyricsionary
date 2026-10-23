import { pickDefinition } from '../src/utils/definitionHighlight';

const verb = (text: string) => ({ partOfSpeech: 'Verb', text });
const noun = (text: string) => ({ partOfSpeech: 'Noun', text });

describe('pickDefinition', () => {
  it('picks the only definition', () => {
    expect(pickDefinition([verb('to have')], 'I free myself')).toBe('to have');
    expect(pickDefinition([verb('to have'), verb('to have')])).toBe('to have');
  });

  it('picks the definition found in the translation', () => {
    expect(pickDefinition([noun('freedom'), noun('love')], 'all my love')).toBe('love');
  });

  it('matches verb definitions without their "to"', () => {
    expect(pickDefinition([verb('to rescue'), verb('to free')], 'Free me now')).toBe('to free');
    expect(pickDefinition([verb('to rescue'), verb('to liberate; to free')], 'free me')).toBe('to liberate; to free');
  });

  it('keeps "to" for other parts of speech', () => {
    expect(pickDefinition([noun('to-do'), noun('to go')], 'go home')).toBeNull();
  });

  it('picks nothing when no definition matches', () => {
    expect(pickDefinition([verb('to free'), verb('to rescue')], 'Let me go')).toBeNull();
    expect(pickDefinition([verb('to free'), verb('to rescue')])).toBeNull();
    expect(pickDefinition([])).toBeNull();
  });
});
