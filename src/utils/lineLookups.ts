/**
 * What a lyric line looked up about its words as it was drawn, e.g. which saved word "Haus" is or
 * whether "la" is ignored, so a change to the saved or ignored words redraws only the lines whose
 * answers changed instead of every line of the song
 */
export type WordLookups = {
  /** The saved word a lyric word stands for */
  saved: (word: string) => unknown;
  /** The saved word spelled exactly so */
  entry: (word: string) => unknown;
  ignored: (word: string) => boolean;
  /** Picked to mark in pick mode */
  picked: (word: string) => boolean;
  /** The saved word a fill-in-the-lyrics gap hides */
  gap: (word: string) => unknown;
  /** How an unsaved German compound splits */
  compound: (word: string) => unknown;
  /** The saved phrases whose words sit apart, e.g. hört … auf */
  splits: () => readonly string[];
};

type Kind = keyof WordLookups;
/** Each lookup a line made, by kind and word, with its answer */
export type LineLookupNotes = Map<string, { kind: Kind; word: string; answer: unknown }>;

/** Lookups that note down each answer in `notes`, answering the same as `lookups` */
export function noteLookups(lookups: WordLookups, notes: LineLookupNotes): WordLookups {
  const noted = <K extends Kind>(kind: K) => (word = '') => {
    const answer = (lookups[kind] as (word: string) => unknown)(word);
    notes.set(`${kind}\u0000${word}`, { kind, word, answer });
    return answer;
  };
  return {
    saved: noted('saved'),
    entry: noted('entry'),
    ignored: noted('ignored') as (word: string) => boolean,
    picked: noted('picked') as (word: string) => boolean,
    gap: noted('gap'),
    compound: noted('compound'),
    splits: noted('splits') as () => readonly string[],
  };
}

const sameAnswer = (a: unknown, b: unknown) =>
  a === b || (Array.isArray(a) && Array.isArray(b) && JSON.stringify(a) === JSON.stringify(b));

/** Whether every lookup noted down still gets the same answer, so the line would look the same */
export function sameLookups(lookups: WordLookups, notes: LineLookupNotes): boolean {
  for (const { kind, word, answer } of notes.values()) {
    if (!sameAnswer((lookups[kind] as (word: string) => unknown)(word), answer)) return false;
  }
  return true;
}
