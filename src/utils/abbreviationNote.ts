// Definitions that only say a word is a shorter or informal form of another, e.g. "Abbreviation of vielleicht"
const ABBREVIATION = /^(?:(?:an? )?(?:informal |colloquial |spoken |dialectal )?(?:abbreviation|contraction|clipping|short(?:ened)? (?:form|version))|short for|shortening|apocopic form|(?:informal|colloquial|spoken) (?:form|spelling|shortening))\s+of\s+\S|^short for\s+\S/i;

/** The note a definition like "Abbreviation of vielleicht" gives the word ("abbreviation of vielleicht"), if it is one */
export function abbreviationNote(definition: string): string | undefined {
  const text = definition.replace(/\s+/g, ' ').trim();
  if (!ABBREVIATION.test(text)) return undefined;
  const note = text.split(/[;:]| \(/)[0].trim().replace(/[.,]+$/, '');
  if (!note || note.length > 80) return undefined;
  return note.charAt(0).toLowerCase() + note.slice(1);
}

/** The note with a definition's abbreviation note added at the top, only when the note is still empty */
export function withAbbreviationNote(note: string, definition: string): string {
  const abbreviation = abbreviationNote(definition);
  if (!abbreviation || note.trim()) return note;
  return abbreviation;
}
