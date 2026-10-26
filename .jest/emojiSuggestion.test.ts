import { suggestEmoji } from '../src/utils/emojiSuggestion';
import emojis from 'rn-emoji-keyboard/lib/commonjs/assets/emojis.json';

const suggest = (definition: string) => suggestEmoji(definition, emojis);

describe('emoji suggestion', () => {
  it('matches an emoji by its name', () => {
    expect(suggest('heart')).toBe('❤️');
    expect(suggest('the sun')).toBe('☀️');
    expect(suggest('fire')).toBe('🔥');
  });

  it('matches plurals and verb forms', () => {
    expect(suggest('cats')).toBe('🐈');
    expect(suggest('to dance')).toBe('🕺');
  });

  it("prefers a smiley over the cat that copies it", () => {
    expect(suggest('tears')).toBe('😂');
  });

  it('suggests nothing for an empty or unknown definition', () => {
    expect(suggest('')).toBeNull();
    expect(suggest('always')).toBeNull();
  });
});
