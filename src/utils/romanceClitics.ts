// Spanish and Portuguese attach object pronouns to verbs, e.g. dímelo (di + me + lo) or amo-te
// (amo + te), and join prepositions to articles, e.g. del (de + el) or na (em + a). The word to look up,
// save and count is the verb or the preposition.

const SPANISH_PRONOUNS = ['me', 'te', 'se', 'lo', 'la', 'le', 'nos', 'os', 'los', 'las', 'les'];
const PORTUGUESE_PRONOUNS = ['me', 'te', 'se', 'lhe', 'lhes', 'nos', 'vos', 'o', 'a', 'os', 'as', 'lo', 'la', 'los', 'las', 'no', 'na', 'nas'];
// Imperatives too short to carry an accent, e.g. the di of dime
const SHORT_IMPERATIVES = new Set(['da', 'di', 'haz', 'ten', 'pon', 'sal', 'ven', 'sé', 'dé']);

const CONTRACTIONS: Record<'spanish' | 'portuguese', Record<string, string>> = {
  spanish: { del: 'de', al: 'a' },
  portuguese: {
    do: 'de', da: 'de', dos: 'de', das: 'de',
    no: 'em', na: 'em', nas: 'em', num: 'em', numa: 'em',
    ao: 'a', aos: 'a', 'à': 'a', 'às': 'a',
    pelo: 'por', pela: 'por', pelos: 'por', pelas: 'por',
  },
};

const removeAcute = (text: string) => text.replace(/[áéíóú]/g, (c) => 'aeiou'['áéíóú'.indexOf(c)]);

/**
 * The verb of a Spanish verb with pronouns attached, e.g. di for dímelo, decir for decírtelo; else null.
 * An infinitive with one pronoun, like amarte, is only taken apart when `loose`, since parte and suerte
 * end the same way.
 */
export function getSpanishVerb(word: string, { loose = false } = {}): string | null {
  let verb = word.toLowerCase();
  let pronouns = 0;
  while (pronouns < 2) {
    const pronoun = [...SPANISH_PRONOUNS].sort((a, b) => b.length - a.length).find((p) => verb.endsWith(p) && verb.length > p.length + 1);
    if (!pronoun) break;
    verb = verb.slice(0, -pronoun.length);
    pronouns++;
  }
  if (pronouns === 0) return null;
  const isVerb =
    /(ando|iendo|yendo)$/.test(removeAcute(verb)) ||
    /[áéíóú]/.test(verb) ||
    SHORT_IMPERATIVES.has(verb) ||
    ((loose || pronouns === 2) && /(ar|er|ir|ír)$/.test(verb));
  if (!isVerb) return null;
  // The accent written to keep the stress, e.g. dí in dímelo, but not oír's own
  return /[aeo]ír$/.test(verb) ? verb : removeAcute(verb);
}

/** The verb of a Portuguese verb with a pronoun after a hyphen, e.g. amo for amo-te, fazer for fazê-lo */
export function getPortugueseVerb(word: string): string | null {
  const parts = word.toLowerCase().split('-');
  if (parts.length < 2 || !parts[0]) return null;
  const pronoun = parts[parts.length - 1];
  if (!PORTUGUESE_PRONOUNS.includes(pronoun)) return null;
  const verb = parts[0];
  // -lo, -la, -los and -las take the infinitive's r, e.g. fazê-lo for fazer, amá-la for amar
  if (/^l(o|a|os|as)$/.test(pronoun) && /[áêéíô]$/.test(verb)) {
    return `${verb.slice(0, -1)}${({ 'á': 'a', 'ê': 'e', 'é': 'e', 'í': 'i', 'ô': 'o' } as Record<string, string>)[verb.slice(-1)]}r`;
  }
  return verb;
}

function songLanguage(languages?: string[]): 'spanish' | 'portuguese' | null {
  const names = (languages ?? []).map((language) => language.toLowerCase());
  if (names.some((name) => name === 'spanish' || name === 'es')) return 'spanish';
  if (names.some((name) => name === 'portuguese' || name === 'pt')) return 'portuguese';
  return null;
}

/**
 * The word a Spanish or Portuguese word with attached pronouns, or a preposition joined to an article,
 * is about: di for dímelo, amo for amo-te, de for del or do; null for other words and languages.
 * `loose` also takes apart forms that ordinary words share, like amarte, for a lookup that falls back
 * to the whole word.
 */
export function getRomanceBaseWord(word: string, languages?: string[], { loose = false } = {}): string | null {
  const language = songLanguage(languages);
  if (!language) return null;
  const contraction = CONTRACTIONS[language][word.toLowerCase()];
  if (contraction) return contraction;
  return language === 'spanish' ? getSpanishVerb(word, { loose }) : getPortugueseVerb(word);
}
