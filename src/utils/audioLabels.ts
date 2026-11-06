/** Wiktionary's audio accents, e.g. "Germany (Berlin)", as a short code for a small chip, e.g. "DE" */
const SHORT: Record<string, string> = {
  'united states': 'US', us: 'US', 'general american': 'GA', ga: 'GA',
  'united kingdom': 'UK', uk: 'UK', england: 'UK', 'southern england': 'UK', 'received pronunciation': 'RP', rp: 'RP',
  scotland: 'SCO', ireland: 'IE', wales: 'WAL', canada: 'CA', australia: 'AU', 'new zealand': 'NZ', 'south africa': 'ZA', india: 'IN',
  germany: 'DE', austria: 'AT', switzerland: 'CH', france: 'FR', belgium: 'BE', quebec: 'QC', 'québec': 'QC',
  spain: 'ES', mexico: 'MX', argentina: 'AR', colombia: 'CO', chile: 'CL', peru: 'PE', venezuela: 'VE', cuba: 'CU',
  'latin america': 'LatAm', portugal: 'PT', brazil: 'BR', italy: 'IT', netherlands: 'NL', sweden: 'SE', norway: 'NO',
  denmark: 'DK', finland: 'FI', poland: 'PL', russia: 'RU', ukraine: 'UA', turkey: 'TR', greece: 'GR', japan: 'JP',
  china: 'CN', taiwan: 'TW', 'hong kong': 'HK', korea: 'KR', 'south korea': 'KR', vietnam: 'VN', thailand: 'TH',
  indonesia: 'ID', egypt: 'EG', israel: 'IL', iran: 'IR',
};

const MAX = 8;

export function shortAudioLabel(label: string): string {
  const text = label.trim();
  // "Germany (Berlin)" -> "Germany", "US, New York" -> "US"
  const main = text.replace(/\s*\(.*\)\s*$/, '').split(',')[0].trim();
  const code = SHORT[main.toLowerCase()];
  if (code) return code;
  if (main.length <= MAX) return main;
  // e.g. "Hamburg Hochdeutsch" -> "Hamburg"
  const first = main.split(/\s+/)[0];
  return first.length <= MAX ? first : `${first.slice(0, MAX - 1)}…`;
}

/** Short labels for a word's recordings, numbered when two shorten the same, e.g. "DE", "DE 2" */
export function shortAudioLabels(labels: string[]): string[] {
  const seen = new Map<string, number>();
  return labels.map((label, index) => {
    const short = label.trim() ? shortAudioLabel(label) : labels.length > 1 ? `${index + 1}` : '';
    const count = (seen.get(short) ?? 0) + 1;
    seen.set(short, count);
    return count > 1 ? `${short} ${count}` : short;
  });
}
