import { checkDictation } from '../src/utils/dictation';

describe('checkDictation', () => {
  it('marks every word right when typed as sung, ignoring case and punctuation', () => {
    const result = checkDictation("Je veux de l'amour, de la joie", "je veux de l'amour de la joie");
    expect(result.words.every((w) => w.mark === 'right')).toBe(true);
    expect(result.right).toBe(7);
    expect(result.extra).toEqual([]);
  });

  it('keeps going after a missed or extra word', () => {
    const result = checkDictation('Je veux de la joie', 'je de la grande joie');
    expect(result.words.map((w) => w.mark)).toEqual(['right', 'missed', 'right', 'right', 'right']);
    expect(result.extra).toEqual(['grande']);
  });

  it('counts a word with only its accents wrong as close', () => {
    const result = checkDictation('Déjà mon cœur', 'deja mon coeur');
    expect(result.words.map((w) => w.mark)).toEqual(['close', 'right', 'close']);
  });

  it('compares a line without spaces by character', () => {
    const result = checkDictation('二人で', '二 人');
    expect(result.words.map((w) => w.mark)).toEqual(['right', 'right', 'missed']);
  });
});
