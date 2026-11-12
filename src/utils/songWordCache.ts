import type { Song, WordEntry } from '../types';
import { isGermanLanguage } from './compoundWords';
import { removeStressMarks } from './russianStress';
import { spellingsOf } from './wordForms';

/**
 * A value counted from each song's lyrics, e.g. its progress, kept until a word it asked about changes.
 * Counting records every word the lyrics asked about, so saving or ignoring a word counts again
 * only the songs with that word in them, not every song.
 */
export class SongWordCache<V> {
  private entries = new Map<string, { song: Song; value: V; asked: Set<string> }>();

  get(song: Song): V | undefined {
    const entry = this.entries.get(song.id);
    return entry && entry.song === song ? entry.value : undefined;
  }

  /**
   * Counts a song's value, which calls asking with every word it looks up, and keeps it. A song changed
   * since it was last counted (another object) is counted again.
   */
  count(song: Song, compute: (asking: (word: string) => void) => V): V {
    const kept = this.get(song);
    if (kept !== undefined) return kept;
    const asked = new Set<string>();
    const value = compute((word) => asked.add(foldWord(word)));
    this.entries.set(song.id, { song, value, asked });
    return value;
  }

  /**
   * Forgets the songs whose lyrics asked about any of the changed words, or that a changed word was
   * saved from; in German, also a word with a changed word inside it, e.g. Liebesbrief for Liebe
   */
  forget(changed: ChangedWords) {
    if (changed.words.size === 0 && changed.songIds.size === 0) return;
    for (const [id, entry] of this.entries) {
      if (changed.songIds.has(id) || asksAbout(entry.asked, changed.words, isGermanSong(entry.song))) this.entries.delete(id);
    }
  }

  /** Another cache with the same songs, so a memo that reads it sees a change */
  copy(): SongWordCache<V> {
    const copy = new SongWordCache<V>();
    copy.entries = new Map(this.entries);
    return copy;
  }

  clear() {
    this.entries.clear();
  }
}

export interface ChangedWords {
  /** Lowercased, without stress marks, with each word of a phrase too */
  words: Set<string>;
  /** Songs a changed word was saved from */
  songIds: Set<string>;
}

const foldWord = (word: string) => removeStressMarks(word.toLowerCase());

const isGermanSong = (song: Song) => isGermanLanguage(song.originalLanguages);

function asksAbout(asked: Set<string>, words: Set<string>, insideToo: boolean): boolean {
  for (const word of words) if (asked.has(word)) return true;
  if (!insideToo) return false;
  for (const question of asked) for (const word of words) if (word.length > 2 && question.includes(word)) return true;
  return false;
}

/** A spelling and, for a phrase like "give up" or "hört … auf", each of its words */
function addSpelling(words: Set<string>, spelling: string) {
  const folded = foldWord(spelling);
  words.add(folded);
  for (const part of folded.split(/[\s…]+/)) if (part) words.add(part);
  // A Chinese or Japanese word's characters are looked up on their own too
  for (const char of folded) if (CJK.test(char)) words.add(char);
}

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

/** The words that differ between two lists of words known by spelling, e.g. saved and ignored words */
export function changedSpellings(before: Set<string>, after: Set<string>): ChangedWords {
  const words = new Set<string>();
  for (const word of before) if (!after.has(word)) addSpelling(words, word);
  for (const word of after) if (!before.has(word)) addSpelling(words, word);
  return { words, songIds: new Set() };
}

/**
 * The words of the saved words added, removed or changed between two lists (the store replaces a changed
 * word with a new object), with the songs they were saved from
 */
export function changedEntries(before: readonly WordEntry[], after: readonly WordEntry[]): ChangedWords {
  const changed: ChangedWords = { words: new Set(), songIds: new Set() };
  const add = (entry: WordEntry) => {
    for (const spelling of spellingsOf(entry)) addSpelling(changed.words, spelling);
    for (const context of entry.contexts ?? []) if (context.songId) changed.songIds.add(context.songId);
  };
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  for (const entry of before) if (!afterSet.has(entry)) add(entry);
  for (const entry of after) if (!beforeSet.has(entry)) add(entry);
  return changed;
}
