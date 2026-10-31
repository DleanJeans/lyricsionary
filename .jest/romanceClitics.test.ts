import { getRomanceBaseWord } from '../src/utils/romanceClitics';

const es = (word: string) => getRomanceBaseWord(word, ['Spanish']);
const pt = (word: string) => getRomanceBaseWord(word, ['Portuguese']);

describe('Spanish', () => {
  it('finds the verb under attached pronouns', () => {
    expect(es('dímelo')).toBe('di');
    expect(es('dame')).toBe('da');
    expect(es('cántame')).toBe('canta');
    expect(getRomanceBaseWord('amarte', ['Spanish'], { loose: true })).toBe('amar');
    expect(es('amarte')).toBeNull();
    expect(es('decírtelo')).toBe('decir');
    expect(es('diciéndole')).toBe('diciendo');
    expect(es('oírte')).toBe('oír');
  });

  it('leaves words that only end like a pronoun', () => {
    expect(es('calle')).toBeNull();
    expect(es('solo')).toBeNull();
    expect(es('mesa')).toBeNull();
    expect(es('ese')).toBeNull();
    expect(es('parte')).toBeNull();
    expect(es('suerte')).toBeNull();
    expect(es('vela')).toBeNull();
  });

  it('counts del and al as their preposition', () => {
    expect(es('del')).toBe('de');
    expect(es('Al')).toBe('a');
    expect(es('no')).toBeNull();
  });
});

describe('Portuguese', () => {
  it('finds the verb before a hyphenated pronoun', () => {
    expect(pt('amo-te')).toBe('amo');
    expect(pt('diga-me')).toBe('diga');
    expect(pt('fazê-lo')).toBe('fazer');
    expect(pt('amá-la')).toBe('amar');
    expect(pt('guarda-chuva')).toBeNull();
  });

  it('counts a preposition joined to an article as the preposition', () => {
    expect(pt('do')).toBe('de');
    expect(pt('na')).toBe('em');
    expect(pt('pelo')).toBe('por');
  });

  it('leaves other languages alone', () => {
    expect(getRomanceBaseWord('del', ['Italian'])).toBeNull();
  });
});
