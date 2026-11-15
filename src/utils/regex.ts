export const accentedAlphabet = 'a-zA-ZÀ-Ÿ';

// Matches contractions with apostrophes:
// French: j', l', d', qu', etc.
// Italian: dell', sull', all', etc.
export const contractedPrefixRegex = new RegExp(`^([${accentedAlphabet}]{1,}')`);

// German shortened forms that drop an "e" before n/m: hab'n -> haben, unser'm -> unserem
// Any apostrophe: straight, curly (\u2018 \u2019), prime, modifier letter, grave or acute accent
const anyApostrophe = `['\u2018\u2019\u2032\u02BC\u0060\u00B4]`;
export const germanShortenedSuffixRegex = new RegExp(`^([${accentedAlphabet}]{2,})${anyApostrophe}([nm])$`);
// German words with a clitic "es": geht's -> geht (es), gibt's -> gibt (es)
export const germanCliticEsRegex = new RegExp(`^([${accentedAlphabet}]{2,})${anyApostrophe}s$`);
// German words that drop a final "e": hab' -> habe
export const germanTrailingElisionRegex = new RegExp(`^[${accentedAlphabet}]{2,}${anyApostrophe}$`);

export const hyphenatedPrefixRegex = new RegExp(`^[${accentedAlphabet}-.]+-`);