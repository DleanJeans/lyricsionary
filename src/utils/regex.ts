export const accentedAlphabet = 'a-zA-ZÀ-Ÿ';

export const contractedPrefixRegex = new RegExp(`^[${accentedAlphabet}]'`);

export const hyphenatedPrefixRegex = new RegExp(`^[${accentedAlphabet}-.]+-`);