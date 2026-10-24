import { pickDefinition, toGerund, toPast, toPlural } from '../src/utils/definitionHighlight';

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

  it('fills verb definitions without their "to" when the translation has none', () => {
    expect(pickDefinition([verb('to rescue'), verb('to free')], 'Free me now')).toBe('free');
    expect(pickDefinition([verb('to rescue'), verb('to liberate; to free')], 'free me')).toBe('liberate; free');
    expect(pickDefinition([verb('to free')], 'Free me now')).toBe('free');
  });

  it('fills a verb as its -ing form when the translation has that', () => {
    expect(pickDefinition([verb('to talk'), verb('to speak')], "He's talking")).toBe('talking');
    expect(pickDefinition([verb('to do'), verb('to make; to build')], 'Making love')).toBe('making');
    expect(pickDefinition([verb('to quit'), verb('to give up')], "I'm giving up")).toBe('giving up');
  });

  it('fills a verb as its past form when the translation has that', () => {
    expect(pickDefinition([verb('to like'), verb('to love')], 'I loved you')).toBe('loved');
    expect(pickDefinition([verb('to quit'), verb('to give up')], 'She gave up')).toBe('gave up');
    expect(pickDefinition([verb('to weep'), verb('to cry')], 'She cried at night')).toBe('cried');
    expect(pickDefinition([verb('to stay'), verb('to go')], "He's gone")).toBe('gone');
  });

  it('fills a noun as its plural when the translation has that', () => {
    expect(pickDefinition([noun('care'), noun('worry'), noun('concern')], 'All my worries are gone')).toBe('worries');
    expect(pickDefinition([noun('sorrow'), noun('tax adviser')], 'We need tax advisers')).toBe('tax advisers');
    expect(pickDefinition([verb('to worry'), verb('to fret')], 'All my worries')).toBeNull();
  });

  it('keeps "to" when the translation has it', () => {
    expect(pickDefinition([verb('to rescue'), verb('to free')], 'I want to free myself')).toBe('to free');
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

describe('toGerund', () => {
  it.each([
    ['talk', 'talking'],
    ['make', 'making'],
    ['die', 'dying'],
    ['see', 'seeing'],
    ['be', 'being'],
    ['run', 'running'],
    ['stop', 'stopping'],
    ['show', 'showing'],
    ['fix', 'fixing'],
    ['play', 'playing'],
    ['visit', 'visiting'],
  ])('%s -> %s', (verb, gerund) => {
    expect(toGerund(verb)).toBe(gerund);
  });
});

describe('toPlural', () => {
  it.each([
    ['worry', 'worries'],
    ['day', 'days'],
    ['kiss', 'kisses'],
    ['box', 'boxes'],
    ['church', 'churches'],
    ['dream', 'dreams'],
  ])('%s -> %s', (noun, plural) => {
    expect(toPlural(noun)).toBe(plural);
  });
});

describe('toPast', () => {
  it.each([
    ['love', ['loved']],
    ['cry', ['cried']],
    ['play', ['played']],
    ['stop', ['stopped']],
    ['walk', ['walked']],
    ['go', ['went', 'gone']],
    ['Feel', ['felt']],
  ])('%s -> %s', (verb, past) => {
    expect(toPast(verb)).toEqual(past);
  });
});

