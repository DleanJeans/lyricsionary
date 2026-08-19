import { languages, countries } from 'countries-list';

// Helper function to generate flag emoji from country code
function countryCodeToFlag(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(char.charCodeAt(0) + 0x1F1E6 - 65))
    .join('');
}

// Mapping of language codes to their primary country code for flag display
const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  en: 'GB', es: 'ES', fr: 'FR', de: 'DE', it: 'IT', pt: 'PT', ja: 'JP', ko: 'KR', zh: 'CN', ru: 'RU',
  ar: 'SA', hi: 'IN', th: 'TH', vi: 'VN', tr: 'TR', nl: 'NL', sv: 'SE', pl: 'PL', ca: 'ES', el: 'GR',
  he: 'IL', id: 'ID', ro: 'RO', cs: 'CZ', hu: 'HU', da: 'DK', no: 'NO', fi: 'FI', uk: 'UA', sk: 'SK',
  hr: 'HR', bg: 'BG', lt: 'LT', sl: 'SI', lv: 'LV', et: 'EE', fa: 'IR', bn: 'BD', ur: 'PK', ms: 'MY',
  ta: 'IN', te: 'IN', mr: 'IN', gu: 'IN', kn: 'IN', ml: 'IN', pa: 'IN', or: 'IN', sw: 'KE', am: 'ET',
  ne: 'NP', si: 'LK', km: 'KH', lo: 'LA', my: 'MM', ka: 'GE', hy: 'AM', az: 'AZ', eu: 'ES', gl: 'ES',
  af: 'ZA', sq: 'AL', be: 'BY', bs: 'BA', cy: 'GB', fo: 'FO', ga: 'IE', is: 'IS', lb: 'LU', mk: 'MK',
  mt: 'MT', mn: 'MN', sr: 'RS', tg: 'TJ', tk: 'TM', uz: 'UZ', yi: 'IL', zu: 'ZA', xh: 'ZA', sn: 'ZW',
  so: 'SO', ha: 'NG', ig: 'NG', yo: 'NG', rw: 'RW', mg: 'MG', ny: 'MW', st: 'LS', tn: 'BW', ts: 'ZA',
  ku: 'IQ', ps: 'AF', ug: 'CN', dv: 'MV', bo: 'CN', sd: 'PK', as: 'IN', ks: 'IN', sa: 'IN', tt: 'RU',
  ba: 'RU', ce: 'RU', cv: 'RU', os: 'GE', ab: 'GE', av: 'RU', kk: 'KZ', ky: 'KG', tl: 'PH', ceb: 'PH',
  ilo: 'PH', war: 'PH', pam: 'PH', jv: 'ID', su: 'ID', mi: 'NZ', sm: 'WS', to: 'TO', fj: 'FJ', ty: 'PF',
  gn: 'PY', qu: 'PE', ay: 'BO', ht: 'HT', co: 'FR', br: 'FR', oc: 'FR', sc: 'IT', rm: 'CH', ia: 'US',
  ie: 'US', io: 'US', eo: 'US', vo: 'US', la: 'VA', gd: 'GB', gv: 'IM', kw: 'GB', an: 'ES', ast: 'ES',
  nv: 'US', oj: 'CA', iu: 'CA', cr: 'CA', mh: 'MH', ch: 'GU', na: 'NR', lg: 'UG', ki: 'KE', lu: 'CD',
  ln: 'CD', wo: 'SN', ff: 'SN', tw: 'GH', ee: 'GH', bm: 'ML', sg: 'CF', ho: 'PG', hz: 'NA', kr: 'NE',
  ng: 'NA', nd: 'ZW', nr: 'ZA', ss: 'SZ', ve: 'ZA', za: 'CN', ii: 'CN', ik: 'US', kl: 'GL', se: 'NO',
};

// Top 20 most popular languages by number of speakers (for sorting)
const TOP_POPULAR_LANGUAGES = [
  'en', 'zh', 'hi', 'es', 'ar', 'bn', 'fr', 'ru', 'pt', 'ur',
  'id', 'de', 'ja', 'sw', 'mr', 'te', 'tr', 'ta', 'vi', 'ko'
];

export interface Language {
  code: string;
  name: string;
  native: string;
  flag: string;
}

// Generate comprehensive language list from countries-list
export const LANGUAGES: Language[] = Object.entries(languages)
  .map(([code, data]) => ({
    code,
    name: data.name,
    native: data.native,
    flag: LANGUAGE_TO_COUNTRY[code] ? countryCodeToFlag(LANGUAGE_TO_COUNTRY[code]) : '🌐',
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function getFlagForLanguage(langName: string): string {
  const lang = LANGUAGES.find(
    (l) => l.name.toLowerCase() === langName.toLowerCase() || l.code.toLowerCase() === langName.toLowerCase()
  );
  return lang?.flag ?? '🌐';
}

export function getLanguageNameFromCode(code: string): string | null {
  if (!code) return null;
  const lang = LANGUAGES.find(
    (l) => l.code.toLowerCase() === code.toLowerCase()
  );
  return lang?.name ?? null;
}

// Get sorted languages: by usage in saved songs first, then by popularity
export function getSortedLanguages(songLanguages?: string[]): Language[] {
  const languageSet = new Set(songLanguages?.map(lang => lang.toLowerCase()) || []);

  return [...LANGUAGES].sort((a, b) => {
    // First priority: languages used in saved songs
    const aInSongs = languageSet.has(a.name.toLowerCase()) || languageSet.has(a.code.toLowerCase());
    const bInSongs = languageSet.has(b.name.toLowerCase()) || languageSet.has(b.code.toLowerCase());

    if (aInSongs && !bInSongs) return -1;
    if (!aInSongs && bInSongs) return 1;

    // Second priority: top 20 popular languages
    const aPopularIndex = TOP_POPULAR_LANGUAGES.indexOf(a.code);
    const bPopularIndex = TOP_POPULAR_LANGUAGES.indexOf(b.code);

    const aIsPopular = aPopularIndex !== -1;
    const bIsPopular = bPopularIndex !== -1;

    if (aIsPopular && !bIsPopular) return -1;
    if (!aIsPopular && bIsPopular) return 1;
    if (aIsPopular && bIsPopular) return aPopularIndex - bPopularIndex;

    // Third priority: alphabetical
    return a.name.localeCompare(b.name);
  });
}

export { TOP_POPULAR_LANGUAGES };
