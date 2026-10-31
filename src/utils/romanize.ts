// A romanized line, made offline, for a song in a script with simple letter-by-letter romanization:
// Cyrillic, Greek, Korean Hangul, Devanagari (Hindi) and Arabic. Japanese and Chinese need a dictionary,
// so they keep a Romanized version saved with the song.

const RUSSIAN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  // Other languages in Cyrillic
  і: 'i', ї: 'yi', є: 'ye', ґ: 'g', ў: 'w', ј: 'j', љ: 'lj', њ: 'nj', ћ: 'ć', ђ: 'đ', џ: 'dž', ѓ: 'gj', ќ: 'kj', ѕ: 'dz',
};
// Ukrainian reads г, и and е differently from Russian
const UKRAINIAN: Record<string, string> = { ...RUSSIAN, г: 'h', и: 'y', е: 'e', й: 'i' };

const GREEK_PAIRS: Record<string, string> = { ου: 'ou', γγ: 'ng', γκ: 'gk', μπ: 'mp', ντ: 'nt' };
const GREEK: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n',
  ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
};

// Revised Romanization of Korean, syllable by syllable
const KOREAN_INITIALS = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const KOREAN_VOWELS = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const KOREAN_FINALS = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];

function romanizeHangul(char: string, atWordStart: boolean): string {
  const index = char.charCodeAt(0) - 0xac00;
  const initial = KOREAN_INITIALS[Math.floor(index / 588)];
  const vowel = KOREAN_VOWELS[Math.floor((index % 588) / 28)];
  const final = KOREAN_FINALS[index % 28];
  // ㄹ starts a word as r in loanwords but reads l there in RR only when doubled; keep r
  return `${atWordStart && initial === 'r' ? 'r' : initial}${vowel}${final}`;
}

// Devanagari: consonants carry an "a" a vowel sign replaces, a virama removes, and a word's last one drops
const DEVANAGARI_CONSONANTS: Record<string, string> = {
  क: 'k', ख: 'kh', ग: 'g', घ: 'gh', ङ: 'ng', च: 'ch', छ: 'chh', ज: 'j', झ: 'jh', ञ: 'ny', ट: 't', ठ: 'th',
  ड: 'd', ढ: 'dh', ण: 'n', त: 't', थ: 'th', द: 'd', ध: 'dh', न: 'n', प: 'p', फ: 'ph', ब: 'b', भ: 'bh',
  म: 'm', य: 'y', र: 'r', ल: 'l', व: 'v', श: 'sh', ष: 'sh', स: 's', ह: 'h', ळ: 'l', क़: 'q', ख़: 'kh',
  ग़: 'gh', ज़: 'z', ड़: 'r', ढ़: 'rh', फ़: 'f',
};
const DEVANAGARI_VOWELS: Record<string, string> = {
  अ: 'a', आ: 'aa', इ: 'i', ई: 'ee', उ: 'u', ऊ: 'oo', ऋ: 'ri', ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au',
};
const DEVANAGARI_SIGNS: Record<string, string> = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
};

function romanizeDevanagariWord(word: string): string {
  let out = '';
  let inherent = false;
  for (const char of word.normalize('NFC')) {
    if (DEVANAGARI_CONSONANTS[char] !== undefined || /[क-हक़-य़]/.test(char)) {
      if (inherent) out += 'a';
      out += DEVANAGARI_CONSONANTS[char] ?? '';
      inherent = true;
    } else if (DEVANAGARI_SIGNS[char] !== undefined) {
      out += DEVANAGARI_SIGNS[char];
      inherent = false;
    } else if (char === '्') {
      inherent = false;
    } else if (char === 'ं' || char === 'ँ') {
      if (inherent) out += 'a';
      out += 'n';
      inherent = false;
    } else if (char === '़') {
      // A nukta changes the consonant before it, e.g. ज़ z; the common ones are precomposed above
    } else {
      if (inherent) out += 'a';
      inherent = false;
      out += DEVANAGARI_VOWELS[char] ?? (char === 'ः' ? 'h' : char === '।' ? '.' : char);
    }
  }
  // Hindi drops a word's last "a", e.g. dil for दिल, but not a one-letter word's
  if (inherent && out.length <= 2) out += 'a';
  return out;
}

const ARABIC: Record<string, string> = {
  ا: 'a', أ: 'a', إ: 'i', آ: 'aa', ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh', د: 'd', ذ: 'dh', ر: 'r',
  ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z', ع: "'", غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l',
  م: 'm', ن: 'n', ه: 'h', ة: 'a', ء: "'", ئ: "'", ؤ: "'", ى: 'a', 'َ': 'a', 'ِ': 'i', 'ُ': 'u', 'ً': 'an',
  'ٍ': 'in', 'ٌ': 'un', 'ْ': '', 'ـ': '', '،': ',', '؟': '?', پ: 'p', چ: 'ch', ژ: 'zh', گ: 'g', ک: 'k', ی: 'y',
};

/** و and ي read as vowels between consonants, e.g. the ي of حبيبي, and as w and y elsewhere */
function romanizeArabicWord(word: string): string {
  const chars = [...word];
  return chars
    .map((char, i) => {
      if (char === 'ّ') return '';
      if (char === 'و' || char === 'ي' || char === 'ی') {
        const before = chars[i - 1];
        const isVowel = !!before && ARABIC[before] !== undefined && !/[اَُِ]/.test(before);
        if (isVowel) return char === 'و' ? 'u' : 'i';
        return char === 'و' ? 'w' : 'y';
      }
      const letter = ARABIC[char] ?? char;
      // A shadda doubles the letter it's on
      return chars[i + 1] === 'ّ' ? letter + letter : letter;
    })
    .join('');
}

const matchCase = (source: string, latin: string) =>
  source !== source.toLowerCase() && latin ? latin[0].toUpperCase() + latin.slice(1) : latin;

function romanizeWord(word: string, language: string): string {
  if (/[Ѐ-ӿ]/.test(word)) {
    const map = ['ukrainian', 'uk'].includes(language.toLowerCase()) ? UKRAINIAN : RUSSIAN;
    return [...word].map((char) => matchCase(char, map[char.toLowerCase()] ?? char)).join('');
  }
  if (/[Ͱ-Ͽ]/.test(word)) {
    const plain = word.normalize('NFD').replace(/[̀-ͯ]/g, '');
    let out = '';
    for (let i = 0; i < plain.length; i++) {
      const pair = GREEK_PAIRS[plain.slice(i, i + 2).toLowerCase()];
      if (pair) {
        out += matchCase(plain[i], pair);
        i++;
      } else {
        out += matchCase(plain[i], GREEK[plain[i].toLowerCase()] ?? plain[i]);
      }
    }
    return out;
  }
  if (/[가-힣]/.test(word)) {
    return [...word].map((char, i) => (/[가-힣]/.test(char) ? romanizeHangul(char, i === 0) : char)).join('');
  }
  if (/[ऀ-ॿ]/.test(word)) return romanizeDevanagariWord(word);
  if (/[؀-ۿ]/.test(word)) return romanizeArabicWord(word);
  return word;
}

/** The line in the Latin alphabet, or null when there's nothing to romanize in it */
export function romanizeLine(line: string, language = ''): string | null {
  if (!/[Ͱ-ϿЀ-ӿ؀-ۿऀ-ॿ가-힣]/.test(line)) return null;
  return line.replace(/[^\s]+/g, (word) => romanizeWord(word, language));
}
