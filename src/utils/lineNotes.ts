/** Lines are noted by their text, so a chorus line's note shows on each repeat */
export function lineNoteKey(line: string): string {
  return line.trim().replace(/\s+/g, ' ');
}

export function getLineNote(notes: Record<string, string> | undefined, line: string): string | undefined {
  const key = lineNoteKey(line);
  return key ? notes?.[key] : undefined;
}

/** The notes with this line's note set, or removed when empty */
export function setLineNote(
  notes: Record<string, string> | undefined,
  line: string,
  note: string
): Record<string, string> | undefined {
  const key = lineNoteKey(line);
  if (!key) return notes;
  const next = { ...notes };
  const text = note.trim();
  if (text) next[key] = text;
  else delete next[key];
  return Object.keys(next).length ? next : undefined;
}
