import type { WordEntry } from '../types';
import { splitIpas } from './ipaList';

/** Which Portuguese a word is pronounced in: Brazilian (BR) or European (PT) */
export type PortugueseVariant = 'br' | 'pt';

export const PORTUGUESE_VARIANT_LABELS: Record<PortugueseVariant, { short: string; name: string }> = {
  br: { short: 'BR', name: 'Brazilian' },
  pt: { short: 'PT', name: 'European' },
};

export interface RegionalIpa {
  br: string[];
  pt: string[];
}

/** Portuguese is the only language with two pronunciation boxes */
export function isPortugueseLanguage(language: string | undefined): boolean {
  return ['portuguese', 'pt'].includes((language ?? '').trim().toLowerCase());
}

const BRAZIL = /\b(?:Brazil(?:ian)?|S[ãa]o Paulo|Rio de Janeiro|Carioca|Paulistano|Caipira|Ga[úu]cho)\b/gi;
const PORTUGAL = /\b(?:Portugal|European|Lisbon|Porto|Alentejo|Algarve|Azores|Madeira)\b/gi;
// Other Portuguese-speaking places have their own IPA that neither box takes
const ELSEWHERE = /\b(?:Angola|Mozambique|Cape Verde|Macau|Timor|Guinea|S[ãa]o Tom[ée]|Goa|Africa(?:n)?)\b/gi;

type Region = 'br' | 'pt' | 'other';

/** The last region named in a piece of page text, e.g. "(Brazil)" or "(Southern Portugal)" */
function lastRegion(text: string): Region | undefined {
  let best: { region: Region; at: number } | undefined;
  for (const [region, pattern] of [['br', BRAZIL], ['pt', PORTUGAL], ['other', ELSEWHERE]] as const) {
    for (const match of text.matchAll(pattern)) {
      if (!best || match.index! >= best.at) best = { region, at: match.index! };
    }
  }
  return best?.region;
}

const MAX_PER_REGION = 2;

/**
 * Phonemic IPA of a Portuguese language section split by the region Wiktionary tags it with, e.g.
 * "(Brazil) IPA: /sa.ˈu.dad͡ʒi/" and "(Portugal) IPA: /sɐˈu.dɨ/". Each pronunciation heading starts over.
 * IPA with no region goes with Brazilian.
 */
export function parseRegionalIpa(section: string): RegionalIpa {
  const found: Record<'br' | 'pt', { phonemic: string[]; narrow: string[] }> = {
    br: { phonemic: [], narrow: [] },
    pt: { phonemic: [], narrow: [] },
  };
  for (const chunk of section.split(/<div\b[^>]*class="[^"]*\bmw-heading\b[^"]*"[^>]*>/i)) {
    let region: Region | undefined;
    let last = 0;
    const spans = chunk.matchAll(/<span\b[^>]*class="IPA\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi);
    for (const span of spans) {
      const before = chunk.slice(last, span.index).replace(/<[^>]+>/g, ' ');
      last = span.index! + span[0].length;
      region = lastRegion(before) ?? region;
      const text = span[1].replace(/<[^>]+>/g, '').trim();
      const target = region === 'pt' ? found.pt : region === 'other' ? undefined : found.br;
      if (!target) continue;
      if (/^\/[^-/][^/]*\/$/.test(text)) {
        if (!target.phonemic.includes(text)) target.phonemic.push(text);
      } else if (/^\[[^-\]][^\]]*\]$/.test(text)) {
        if (!target.narrow.includes(text)) target.narrow.push(text);
      }
    }
  }
  const pick = (r: { phonemic: string[]; narrow: string[] }) =>
    (r.phonemic.length > 0 ? r.phonemic : r.narrow).slice(0, MAX_PER_REGION);
  return { br: pick(found.br), pt: pick(found.pt) };
}

/** The pronunciation a word keeps for a variant; for a word that has just one, it is the Brazilian one */
export function variantPronunciation(word: Pick<WordEntry, 'pronunciation' | 'pronunciationPT'>, variant: PortugueseVariant): string {
  return variant === 'pt' ? word.pronunciationPT ?? '' : word.pronunciation;
}

/**
 * A Portuguese word with the pronunciation of the preferred variant in `pronunciation`, so the IPA above lyrics
 * follows the setting. Marked `ptFirst` so a card can tell which is which. Other words are left alone.
 */
export function withPreferredVariant<T extends WordEntry>(word: T, variant: PortugueseVariant): T {
  if (variant !== 'pt' || !isPortugueseLanguage(word.language) || splitIpas(word.pronunciationPT).length === 0) return word;
  return { ...word, pronunciation: word.pronunciationPT!, pronunciationPT: word.pronunciation, ptFirst: true };
}

/** A word's Brazilian and European IPAs whichever way round `withPreferredVariant` left them */
export function brAndPt(word: Pick<WordEntry, 'pronunciation' | 'pronunciationPT' | 'ptFirst'>): { br: string; pt: string } {
  const [br, pt] = word.ptFirst ? [word.pronunciationPT ?? '', word.pronunciation] : [word.pronunciation, word.pronunciationPT ?? ''];
  return { br, pt };
}
