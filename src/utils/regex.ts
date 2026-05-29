export const accentedAlphabet = 'a-zA-ZÀ-Ÿ';

// Matches contractions with apostrophes:
// French: j', l', d', qu', etc.
// Italian: dell', sull', all', etc.
export const contractedPrefixRegex = new RegExp(`^([${accentedAlphabet}]{1,}')`);

export const hyphenatedPrefixRegex = new RegExp(`^[${accentedAlphabet}-.]+-`);