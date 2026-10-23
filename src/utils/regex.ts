export const accentedAlphabet = 'a-zA-ZÀ-Ÿ';

// Matches contractions with apostrophes:
// French: j', l', d', qu', etc.
// Italian: dell', sull', all', etc.
export const contractedPrefixRegex = new RegExp(`^([${accentedAlphabet}]{1,}')`);

// German shortened forms that drop an "e" before n/m: hab'n -> haben, unser'm -> unserem
export const germanShortenedSuffixRegex = new RegExp(`^([${accentedAlphabet}]{2,})'([nm])$`);
// German words that drop a final "e": hab' -> habe
export const germanTrailingElisionRegex = new RegExp(`^[${accentedAlphabet}]{2,}'$`);

export const hyphenatedPrefixRegex = new RegExp(`^[${accentedAlphabet}-.]+-`);