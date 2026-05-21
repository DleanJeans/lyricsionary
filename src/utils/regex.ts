export const accentedAlphabet = 'a-zA-ZÀ-Ÿ';

// Matches single letter + apostrophe (j', l', d', etc.) or special case "qu'"
export const contractedPrefixRegex = new RegExp(`^([${accentedAlphabet}]'|qu')`);

export const hyphenatedPrefixRegex = new RegExp(`^[${accentedAlphabet}-.]+-`);