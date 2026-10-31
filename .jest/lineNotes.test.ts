import { getLineNote, lineNoteKey, setLineNote } from '../src/utils/lineNotes';

describe('line notes', () => {
  it('keys a line by its trimmed text', () => {
    expect(lineNoteKey('  Hello   there ')).toBe('Hello there');
  });

  it('sets, reads and removes a note', () => {
    const notes = setLineNote(undefined, 'Je t’aime ', ' a love song cliché ');
    expect(notes).toEqual({ 'Je t’aime': 'a love song cliché' });
    expect(getLineNote(notes, 'Je t’aime')).toBe('a love song cliché');
    expect(setLineNote(notes, 'Je t’aime', '  ')).toBeUndefined();
  });

  it('ignores empty lines', () => {
    expect(setLineNote(undefined, '   ', 'note')).toBeUndefined();
    expect(getLineNote({ '': 'x' }, '')).toBeUndefined();
  });
});
