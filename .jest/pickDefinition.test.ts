import { pickDefinition } from '../src/utils/definitionHighlight';

describe('pickDefinition', () => {
  it('picks the only definition', () => {
    expect(pickDefinition(['to have'], 'I free myself')).toBe('to have');
    expect(pickDefinition(['to have', 'to have'])).toBe('to have');
  });

  it('picks the definition found in the translation', () => {
    expect(pickDefinition(['to free', 'to have; to own'], "I've got to own it")).toBe('to have; to own');
  });

  it('picks nothing when no definition matches', () => {
    expect(pickDefinition(['to free', 'to rescue'], 'Let me go')).toBeNull();
    expect(pickDefinition(['to free', 'to rescue'])).toBeNull();
    expect(pickDefinition([])).toBeNull();
  });
});
