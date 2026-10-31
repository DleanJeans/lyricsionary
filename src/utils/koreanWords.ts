// Korean attaches particles to the word they follow, e.g. 너를 is 너 + 를 ("you" as the object), so the
// word to look up, save and count is the word without them

/** Particles that only follow a syllable ending in a consonant, e.g. 사랑을 */
const AFTER_CONSONANT = ['이랑', '으로', '은', '이', '을', '과'];
/** Particles that only follow a syllable ending in a vowel, e.g. 너를 */
const AFTER_VOWEL = ['랑', '로', '는', '가', '를', '와'];
/** Particles that follow any syllable and are rarely the end of a word themselves */
const AFTER_ANY = ['에서', '에게', '한테', '에', '의'];
/** Particles that are also the end of many words, e.g. the 도 of 포도 "grape", so only tried in a lookup */
const LOOSE = ['까지', '부터', '처럼', '보다', '도', '만'];

/** Particles another one can follow, e.g. the 에서 in 학교에서는 */
const STACKED = ['에서', '에게', '한테', '까지', '부터', '에'];

const isHangulSyllable = (char: string) => char >= '가' && char <= '힣';
const endsInConsonant = (char: string) => (char.charCodeAt(0) - 0xac00) % 28 !== 0;

function stripParticle(word: string, loose: boolean): string | null {
  const particles = [...AFTER_CONSONANT, ...AFTER_VOWEL, ...AFTER_ANY, ...(loose ? LOOSE : [])]
    .sort((a, b) => b.length - a.length);
  for (const particle of particles) {
    if (!word.endsWith(particle) || word.length <= particle.length) continue;
    const before = word[word.length - particle.length - 1];
    if (!isHangulSyllable(before)) continue;
    // 로 also follows ㄹ, e.g. 서울로
    const consonant = endsInConsonant(before) && !(particle === '로' && (before.charCodeAt(0) - 0xac00) % 28 === 8);
    if (AFTER_CONSONANT.includes(particle) && !consonant) continue;
    if (AFTER_VOWEL.includes(particle) && consonant) continue;
    return word.slice(0, -particle.length);
  }
  return null;
}

/**
 * A Korean word without the particles after it, e.g. 너 for 너를 and 학교 for 학교에서는; null when it
 * has none. `loose` also takes off particles that end many words themselves, like 도, for a lookup that
 * falls back to the whole word.
 */
export function getKoreanStem(word: string, { loose = false } = {}): string | null {
  const stem = stripParticle(word, loose);
  if (!stem) return null;
  // A topic or other particle after a place or time one, e.g. 에서 + 는 in 학교에서는
  const particle = word.slice(stem.length);
  if (['는', '은', '도', '만', '의'].includes(particle)) {
    const inner = STACKED.find((p) => stem.endsWith(p) && stem.length > p.length);
    if (inner) return stem.slice(0, -inner.length);
  }
  return stem;
}

export const isKoreanLanguage = (languages?: string[]): boolean =>
  !!languages?.some((language) => ['korean', 'ko'].includes(language.toLowerCase()));
