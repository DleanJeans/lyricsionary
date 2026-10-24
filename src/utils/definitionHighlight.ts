import type { WiktionaryDefinition } from './wiktionary';

const WORD_CHAR = /[\p{L}\p{N}]/u;

// Curly apostrophes and quotes count as straight ones; same length, so indexes still line up.
function normalize(text: string): string {
  return text.toLowerCase().replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"');
}

// The whole definition first, then each part of a list like "to have; 've got".
function candidatesOf(definition: string): string[] {
  const whole = definition.replace(/\([^)]*\)/g, ' ').trim();
  const parts = whole.split(/[,;/]/).map((part) => part.trim());
  return [whole, ...parts].filter(Boolean);
}

// Where a needle appears as whole words from position `from`, or -1.
// An edge that isn't a letter, like the apostrophe in "'ve got", can sit inside a word ("I've got"),
// and so can a contracted "n't", on either side: "n't" and "is" both match in "isn't".
function indexOfWhole(haystack: string, needle: string, from = 0): number {
  const checkBefore = WORD_CHAR.test(needle[0]) && !needle.startsWith("n't");
  const checkAfter = WORD_CHAR.test(needle[needle.length - 1]);
  let index = haystack.indexOf(needle, from);
  while (index >= 0) {
    const before = haystack[index - 1];
    const after = haystack[index + needle.length];
    const okBefore = !checkBefore || !before || !WORD_CHAR.test(before);
    const okAfter = !checkAfter || !after || !WORD_CHAR.test(after) || haystack.startsWith("n't", index + needle.length);
    if (okBefore && okAfter) return index;
    index = haystack.indexOf(needle, index + 1);
  }
  return -1;
}

// Contracted spellings of a word, as [before, word, after]: the word only matches between the two,
// e.g. "will" as the "wo" of "won't", "not" as the "not" of "cannot"
const CONTRACTIONS: Record<string, Array<[string, string, string]>> = {
  not: [['', "n't", ''], ['can', 'not', '']],
  can: [['', 'can', 'not']],
  will: [['', 'wo', "n't"], ['', "'ll", '']],
  shall: [['', 'sha', "n't"]],
  am: [['', "'m", '']],
  are: [['', "'re", '']],
  have: [['', "'ve", '']],
};

// The range of a needle as whole words from position `from`, also in its contracted spellings, e.g.
// "will" in "won't" or "I'll"; null when it isn't there.
function findWhole(haystack: string, needle: string, from = 0): [number, number] | null {
  const index = indexOfWhole(haystack, needle, from);
  if (index >= 0) return [index, index + needle.length];
  for (const [before, word, after] of CONTRACTIONS[needle] ?? []) {
    const contracted = indexOfWhole(haystack, before + word + after, Math.max(0, from - before.length));
    if (contracted >= 0) return [contracted + before.length, contracted + before.length + word.length];
  }
  return null;
}

// Most words that can sit between the parts of a split phrase, e.g. "much" in "give much away"
const MAX_GAP_WORDS = 3;

// A multi-word needle split up by other words, e.g. "give away" in "give much away"; one range per word
function findSplitPhrase(haystack: string, needle: string): Array<[number, number]> | null {
  const words = needle.split(/\s+/);
  if (words.length < 2) return null;
  for (let first = findWhole(haystack, words[0]); first; first = findWhole(haystack, words[0], first[0] + 1)) {
    const ranges: Array<[number, number]> = [first];
    for (const word of words.slice(1)) {
      const previousEnd = ranges[ranges.length - 1][1];
      const range = findWhole(haystack, word, previousEnd);
      const gap = range ? haystack.slice(previousEnd, range[0]).trim() : '';
      if (!range || (gap && gap.split(/\s+/).length > MAX_GAP_WORDS) || /[.,;:!?]/.test(gap)) break;
      ranges.push(range);
    }
    if (ranges.length === words.length) return ranges;
  }
  return null;
}

// Finds the first definition that appears in the translation as whole words, as the ranges to
// highlight: one for a phrase in one piece, or one per word when other words split it up.
export function findDefinitionHighlight(text: string, definitions: string[]): Array<[number, number]> | null {
  const haystack = normalize(text);
  for (const definition of definitions) {
    for (const candidate of candidatesOf(definition)) {
      const needle = normalize(candidate);
      const range = findWhole(haystack, needle);
      if (range) return [range];
    }
  }
  for (const definition of definitions) {
    for (const candidate of candidatesOf(definition)) {
      const ranges = findSplitPhrase(haystack, normalize(candidate));
      if (ranges) return ranges;
    }
  }
  return null;
}

// Highlights for several words at once, like the parts of a split compound: each word's first
// matching definition, with overlaps merged and ranges only spaces apart joined into one,
// e.g. Liebe "love" + Brief "letter" -> one highlight over "love letter".
export function findDefinitionHighlights(text: string, definitionGroups: string[][]): Array<[number, number]> | null {
  const ranges = definitionGroups
    .flatMap((definitions) => findDefinitionHighlight(text, definitions) ?? [])
    .sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && (start <= last[1] || !text.slice(last[1], start).trim())) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged.length ? merged : null;
}

// Verb definitions match without their "to", e.g. "to free; to rescue" as "free; rescue"
function withoutInfinitiveTo(definition: string): string {
  return definition.replace(/(^|[,;/]\s*)to\s+/gi, '$1');
}

// English -ing form of a verb: talk -> talking, make -> making, die -> dying, run -> running
export function toGerund(verb: string): string {
  const word = verb.toLowerCase();
  if (word.endsWith('ie')) return `${verb.slice(0, -2)}ying`;
  if (/[^aeiouy]e$/.test(word) && word !== 'be') return `${verb.slice(0, -1)}ing`;
  // One short vowel then one consonant doubles it (run, stop, sit), but not w, x or y (show, fix, play)
  if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(word)) return `${verb}${verb.slice(-1)}ing`;
  return `${verb}ing`;
}

// Irregular English past tense and past participle forms of common verbs
const IRREGULAR_PAST: Record<string, string[]> = {
  be: ['was', 'were', 'been'], have: ['had'], do: ['did', 'done'], go: ['went', 'gone'],
  say: ['said'], make: ['made'], get: ['got', 'gotten'], know: ['knew', 'known'],
  think: ['thought'], take: ['took', 'taken'], see: ['saw', 'seen'], come: ['came', 'come'],
  give: ['gave', 'given'], find: ['found'], tell: ['told'], feel: ['felt'], leave: ['left'],
  keep: ['kept'], let: ['let'], begin: ['began', 'begun'], hold: ['held'], bring: ['brought'],
  write: ['wrote', 'written'], stand: ['stood'], understand: ['understood'], lose: ['lost'],
  pay: ['paid'], meet: ['met'], run: ['ran', 'run'], sit: ['sat'], speak: ['spoke', 'spoken'],
  lie: ['lay', 'lain'], lead: ['led'], grow: ['grew', 'grown'], fall: ['fell', 'fallen'],
  break: ['broke', 'broken'], forget: ['forgot', 'forgotten'], forgive: ['forgave', 'forgiven'],
  sleep: ['slept'], sing: ['sang', 'sung'], fly: ['flew', 'flown'], fight: ['fought'],
  hear: ['heard'], hide: ['hid', 'hidden'], buy: ['bought'], catch: ['caught'], teach: ['taught'],
  seek: ['sought'], build: ['built'], send: ['sent'], spend: ['spent'], win: ['won'],
  wake: ['woke', 'woken'], wear: ['wore', 'worn'], burn: ['burnt', 'burned'], dream: ['dreamt', 'dreamed'],
  shine: ['shone'], drink: ['drank', 'drunk'], eat: ['ate', 'eaten'], drive: ['drove', 'driven'],
  ride: ['rode', 'ridden'], rise: ['rose', 'risen'], choose: ['chose', 'chosen'], steal: ['stole', 'stolen'],
  swim: ['swam', 'swum'], throw: ['threw', 'thrown'], blow: ['blew', 'blown'], draw: ['drew', 'drawn'],
  shake: ['shook', 'shaken'], bite: ['bit', 'bitten'], freeze: ['froze', 'frozen'], hang: ['hung'],
  shoot: ['shot'], bleed: ['bled'], feed: ['fed'], hurt: ['hurt'], cut: ['cut'], put: ['put'],
  set: ['set'], shut: ['shut'], quit: ['quit'], read: ['read'], mean: ['meant'], sell: ['sold'],
  stick: ['stuck'], strike: ['struck'], swear: ['swore', 'sworn'], tear: ['tore', 'torn'],
  become: ['became', 'become'], light: ['lit'], slide: ['slid'], spin: ['spun'], dig: ['dug'],
};

// English past tense forms of a verb: love -> loved, cry -> cried, stop -> stopped, go -> went, gone
export function toPast(verb: string): string[] {
  const word = verb.toLowerCase();
  const irregular = IRREGULAR_PAST[word];
  if (irregular) return irregular;
  if (word.endsWith('e')) return [`${verb}d`];
  if (/[^aeiou]y$/.test(word)) return [`${verb.slice(0, -1)}ied`];
  if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(word)) return [`${verb}${verb.slice(-1)}ed`];
  return [`${verb}ed`];
}

// English plural of a noun: worry -> worries, kiss -> kisses, day -> days, dream -> dreams
export function toPlural(noun: string): string {
  const word = noun.toLowerCase();
  if (/[^aeiou]y$/.test(word)) return `${noun.slice(0, -1)}ies`;
  if (/(?:s|x|z|ch|sh)$/.test(word)) return `${noun}es`;
  return `${noun}s`;
}

// Each meaning in a list like "to give up; to quit (a job)", without parentheticals or "to"
function partsOf(definition: string): string[] {
  return definition
    .split(/[,;/]/)
    .map((part) => withoutInfinitiveTo(part.replace(/\([^)]*\)/g, ' ').trim()))
    .filter(Boolean);
}

// Each verb as its -ing form, e.g. "to give up; to quit" -> "giving up", "quitting"
function gerundsOf(definition: string): string[] {
  return partsOf(definition).map((part) => part.replace(/^\S+/, toGerund));
}

// Each noun as its plural, e.g. "worry; tax adviser" -> "worries", "tax advisers"
function pluralsOf(definition: string): string[] {
  return partsOf(definition).map((part) => part.replace(/\S+$/, toPlural));
}

// Each verb's past forms, e.g. "to give up; to cry" -> "gave up", "given up", "cried". Not the third
// person ("cries"), which reads the same as a noun's plural ("All my worries").
function pastFormsOf(definition: string): string[] {
  return partsOf(definition).flatMap((part) => {
    const [verb] = part.split(/\s/);
    return toPast(verb).map((form) => form + part.slice(verb.length));
  });
}

// The definition to fill in by itself: the first that appears in the translation, or else the only one.
// A verb that only matches without its "to" is filled in without it, e.g. "free" for "Free me",
// or as its -ing form, e.g. "talking" for "He's talking", or a past form, e.g. "loved" for
// "I loved you" or "gave up" for "She gave up". A noun can match as its plural, e.g.
// Sorgen's "worry" fills in "worries".
export function pickDefinition(definitions: WiktionaryDefinition[], translation?: string): string | null {
  const unique = [...new Map(definitions.filter((d) => d.text).map((d) => [d.text, d])).values()];
  if (translation) {
    for (const { text, partOfSpeech } of unique) {
      if (findDefinitionHighlight(translation, [text])) return text;
      if (partOfSpeech.toLowerCase() === 'noun') {
        const plural = pluralsOf(text).find((p) => findDefinitionHighlight(translation, [p]));
        if (plural) return plural;
      }
      if (partOfSpeech.toLowerCase() !== 'verb') continue;
      const withoutTo = withoutInfinitiveTo(text);
      if (findDefinitionHighlight(translation, [withoutTo])) return withoutTo;
      const gerund = gerundsOf(text).find((g) => findDefinitionHighlight(translation, [g]));
      if (gerund) return gerund;
      const past = pastFormsOf(text).find((p) => findDefinitionHighlight(translation, [p]));
      if (past) return past;
    }
  }
  return unique.length === 1 ? unique[0].text : null;
}
