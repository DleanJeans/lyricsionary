import { languageKey } from '../constants/languages';
import { MASTERY_LEVELS, type MasteryLevel, type WordEntry } from '../types';

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];
/** Below A1 */
export const PRE_A1 = 'Pre-A1';

/** How many known words reach each level, A1 to C2, and where the numbers come from */
export interface CefrScale {
  words: [number, number, number, number, number, number];
  source: string;
}

// Mastered words to reach each level. Studies count words differently (lemmas, word lists, receptive
// tests) and none covers every language, so these are rough; each says where it comes from.
const MILTON_ENGLISH: CefrScale = {
  // A2 to C2: the lowest X_Lex score (of the 5,000 most frequent words) of learners at each level,
  // Milton & Alexiou 2009; A1: the A1 band of the English KELLY list
  words: [790, 1500, 2750, 3250, 3750, 4500],
  source: 'From learners tested at each level (Milton & Alexiou 2009) and the KELLY word list',
};
const MILTON_FRENCH: CefrScale = {
  // Halfway between the mean X_Lex scores of French learners at each level and the one below (1,160,
  // 1,650, 2,422, 2,630, 3,212, 3,525; Milton & Alexiou 2009), since the means are of learners already there
  words: [580, 1400, 2040, 2530, 2920, 3370],
  source: 'From French learners tested at each level (Milton & Alexiou 2009)',
};

const SCALES: Record<string, CefrScale> = {
  english: MILTON_ENGLISH,
  french: MILTON_FRENCH,
  // No study of their own was found; close to French, and an Italian B2 learner knows about 2,000 words
  // (Marello)
  spanish: { ...MILTON_FRENCH, source: 'French learners\u2019 numbers (Milton & Alexiou 2009); no Spanish study was found' },
  italian: { ...MILTON_FRENCH, source: 'French learners\u2019 numbers (Milton & Alexiou 2009); no Italian study was found' },
  portuguese: { ...MILTON_FRENCH, source: 'French learners\u2019 numbers (Milton & Alexiou 2009); no Portuguese study was found' },
  greek: {
    // Halfway between the mean scores of Greek learners at each level and the one below (1,486, 2,237,
    // 3,288, 3,956; Milton & Alexiou); C1 and C2 go on in the same steps
    words: [740, 1860, 2760, 3620, 4350, 5130],
    source: 'From Greek learners tested at A1 to B2 (Milton & Alexiou); C1 and C2 continue the steps',
  },
  german: {
    // Goethe-Institut word lists: about 650 (A1), 1,300 (A2) and 2,400 (B1) words; none past B1
    words: [650, 1300, 2400, 3500, 4500, 5500],
    source: 'From the Goethe-Institut word lists for A1 to B1; B2 to C2 continue the steps',
  },
  russian: {
    // The TORFL (ТРКИ) lexical minimum for each level
    words: [780, 1300, 2300, 10000, 12000, 20000],
    source: 'From the lexical minimum of each TORFL (ТРКИ) level',
  },
  japanese: {
    // JLPT N5 to N1 map to A1 to C1 (jlpt.jp); words from the old JLPT test specification (N5 ~800,
    // N4 ~1,500, N2 ~6,000, N1 ~10,000) with N3 between; no level is C2
    words: [800, 1500, 3750, 6000, 10000, 15000],
    source: 'From the JLPT: N5 to N1 as A1 to C1, with their word counts; C2 continues the steps',
  },
  chinese: {
    // HSK 3.0 (2025 syllabus) words: HSK 2 500, 3 1,000, 4 2,000, 5 3,600, 6 5,400, 7-9 11,000, as A1 to
    // C2 by the common HSK to CEFR charts
    words: [500, 1000, 2000, 3600, 5400, 11000],
    source: 'From the HSK 3.0 word lists, HSK 2 to 7\u20139 as A1 to C2',
  },
  korean: {
    // The National Institute of Korean Language's graded list: 982 beginner, 3,093 intermediate and
    // 5,950 advanced words in all, as A2, B2 and C2, with the levels between in the middle
    words: [500, 980, 2000, 3100, 4500, 5950],
    source: 'From the National Institute of Korean Language\u2019s beginner, intermediate and advanced word lists',
  },
};
// Words saved under these names are Chinese too
SCALES['chinese (simplified)'] = SCALES['chinese (traditional)'] = SCALES.mandarin = SCALES.chinese;

const DEFAULT_SCALE: CefrScale = { ...MILTON_ENGLISH, source: 'English learners\u2019 numbers (Milton & Alexiou 2009); no study of this language was found' };

/** The words a language needs for each level, by its name or code, e.g. "fr" or "French" */
export function cefrScale(language: string): CefrScale {
  return SCALES[languageKey(language)] ?? DEFAULT_SCALE;
}

/**
 * How much a word at each level counts toward the level. The studies' numbers come from tests of
 * knowing a word's meaning, which Recognized words have shown and Recalled words have more than shown.
 */
export const LEVEL_WEIGHTS: Record<MasteryLevel, number> = { Seen: 0.1, Recognized: 0.5, Recalled: 0.9, Known: 1 };
/** A saved phrase like "auf jeden Fall" isn't a word of its own for the level */
const isSingleWord = (w: WordEntry) => !/\s/.test(w.word.trim());

export interface CefrProgress {
  language: string;
  /** The words known, each level weighted (LEVEL_WEIGHTS) and rounded; merged forms count once with their word */
  mastered: number;
  /** What each level adds to `mastered`, before rounding */
  parts: Record<MasteryLevel, number>;
  /** The level reached, or Pre-A1 */
  level: CefrLevel | typeof PRE_A1;
  /** The next level, or null at C2 */
  next: CefrLevel | null;
  /** Words the level reached needs (0 for Pre-A1) and the next one needs */
  from: number;
  to: number;
  /** How far from the level reached to the next one, 0 to 1 (1 at C2) */
  fraction: number;
  scale: CefrScale;
}

/** The CEFR level the known words of a language reach, and how far it is to the next one */
export function cefrProgress(words: WordEntry[], language: string): CefrProgress {
  const key = languageKey(language);
  const parts: Record<MasteryLevel, number> = { Seen: 0, Recognized: 0, Recalled: 0, Known: 0 };
  // A base word and the forms linked to it count once, at the highest level among them
  const ids = new Set(words.map((w) => w.id));
  const best = new Map<string, number>();
  for (const w of words) {
    const root = w.baseId && ids.has(w.baseId) ? w.baseId : w.id;
    best.set(root, Math.max(best.get(root) ?? 0, MASTERY_LEVELS.indexOf(w.masteryLevel ?? 'Seen')));
  }
  for (const w of words) {
    if (!isSingleWord(w) || languageKey(w.language) !== key) continue;
    if (w.baseId && ids.has(w.baseId)) continue;
    const level = MASTERY_LEVELS[best.get(w.id) ?? 0];
    parts[level] += LEVEL_WEIGHTS[level];
  }
  const mastered = Math.round(MASTERY_LEVELS.reduce((sum, l) => sum + parts[l], 0));
  const scale = cefrScale(language);
  const reached = scale.words.filter((n) => mastered >= n).length;
  const level = reached ? CEFR_LEVELS[reached - 1] : PRE_A1;
  const next = reached < CEFR_LEVELS.length ? CEFR_LEVELS[reached] : null;
  const from = reached ? scale.words[reached - 1] : 0;
  const to = next ? scale.words[reached] : from;
  const fraction = next ? (mastered - from) / (to - from) : 1;
  return { language, mastered, parts, level, next, from, to, fraction, scale };
}

/** Every language with saved words, the one with the most mastered words first */
export function cefrByLanguage(words: WordEntry[]): CefrProgress[] {
  const names = new Map<string, string>();
  for (const w of words) if (!names.has(languageKey(w.language))) names.set(languageKey(w.language), w.language);
  return [...names.values()].map((l) => cefrProgress(words, l)).sort((a, b) => b.mastered - a.mastered);
}
