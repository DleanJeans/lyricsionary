export const accentedAlphabet = 'a-zA-ZÀ-Ÿ';

// Matches contractions with apostrophes:
// - Single letter + apostrophe (j', l', d', etc.) for French
// - "qu'" special case for French
// - Multi-letter + apostrophe (dell', sull', all', etc.) for Italian
export const contractedPrefixRegex = new RegExp(`^([${accentedAlphabet}]'|qu'|[${accentedAlphabet}]{2,}')`);

export const hyphenatedPrefixRegex = new RegExp(`^[${accentedAlphabet}-.]+-`);