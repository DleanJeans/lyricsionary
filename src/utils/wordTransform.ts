import { contractedPrefixRegex, hyphenatedPrefixRegex } from './regex';

/**
 * Transform a word into an array of transformed versions for word lookup.
 * Handles various French word patterns and transformations.
 *
 * @param word The word to transform
 * @param language Optional language hint for language-specific transformations
 * @returns Array of transformed word versions, or empty array if no transformations apply
 */
export function getWordTransforms(word: string, language?: string): string[] {
  if (!word || word.length === 0) return [];

  const transforms: string[] = [];
  const isFrench = language?.toLowerCase().includes('french') || language?.toLowerCase() === 'français';

  // Handle capitalization
  if (isCapitalized(word)) {
    transforms.push(getLowercaseVersion(word));
  }

  // Handle contracted prefix (e.g., "j'aime" -> "j'", "aime")
  // Also handles double contractions (e.g., "j't'aime" -> "j'", "aime")
  if (hasContractedPrefix(word)) {
    // Split into prefix and base word
    const parts = splitContractedPrefix(word);
    if (parts.length >= 2) {
      transforms.push(...parts);
    }

    // For French, also provide version with apostrophe replaced by 'e'
    // e.g., "d'bouts" -> "debouts"
    if (isFrench) {
      transforms.push(replaceApostropheWithE(word));
    }
  }

  // Handle hyphenated words with hyphens (e.g., "senti-mentale" -> "sentimentale")
  if (hasHyphenInMiddle(word)) {
    transforms.push(getWithoutHyphens(word));
  }

  // Handle hyphenated prefix (e.g., "mélan-mélanger" -> "mélanger")
  if (hasHyphenatedPrefix(word)) {
    transforms.push(getWithoutHyphenatedPrefix(word));
  }

  return transforms;
}

// Helper functions for checking word properties
export function isCapitalized(word: string): boolean {
  if (!word || word.length === 0) return false;
  return word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase();
}

export function hasContractedPrefix(word: string): boolean {
  if (!word || word.length < 2) return false;
  return contractedPrefixRegex.test(word);
}

export function hasHyphenatedPrefix(word: string): boolean {
  if (!word || word.length < 2) return false;
  return hyphenatedPrefixRegex.test(word);
}

export function hasHyphenInMiddle(word: string): boolean {
  if (!word || word.length < 3) return false;
  // Check if hyphen exists but not at the start (hyphenated prefix is handled separately)
  const hyphenIndex = word.indexOf('-');
  return hyphenIndex > 0 && hyphenIndex < word.length - 1 && !hasHyphenatedPrefix(word);
}

// Transformation functions
export function getLowercaseVersion(word: string): string {
  return word.charAt(0).toLowerCase() + word.slice(1);
}

export function getWithoutContractedPrefix(word: string): string {
  if (hasContractedPrefix(word)) {
    return word.slice(2); // Remove first letter and apostrophe
  }
  return word;
}

/**
 * Split contracted prefix into parts.
 * Handles multiple contractions in a word.
 * Examples:
 * - "j'aime" -> ["j'", "aime"]
 * - "l'essence" -> ["l'", "essence"]
 * - "d'y" -> ["d'", "y"]
 * - "j't'aime" -> ["j'", "aime"] (skips intermediate contracted parts)
 */
export function splitContractedPrefix(word: string): string[] {
  if (!hasContractedPrefix(word)) {
    return [word];
  }

  const parts: string[] = [];
  const prefix = word.slice(0, 2); // First letter and apostrophe
  parts.push(prefix);

  let remaining = word.slice(2);

  // Check if remaining part also has a contracted prefix (e.g., "t'aime" in "j't'aime")
  // Skip it and just get the final base word
  while (remaining.length >= 2 && contractedPrefixRegex.test(remaining)) {
    remaining = remaining.slice(2);
  }

  if (remaining.length > 0) {
    parts.push(remaining);
  }

  return parts;
}

/**
 * Replace apostrophe with 'e' for French words like "d'bouts" -> "debouts"
 * Only applies when word starts with a letter followed by apostrophe
 */
export function replaceApostropheWithE(word: string): string {
  if (hasContractedPrefix(word)) {
    return word.charAt(0) + 'e' + word.slice(2);
  }
  return word;
}

export function getWithoutHyphenatedPrefix(word: string): string {
  if (hasHyphenatedPrefix(word)) {
    const hyphenIndex = word.indexOf('-');
    return word.slice(hyphenIndex + 1); // Remove everything up to and including the hyphen
  }
  return word;
}

/**
 * Remove all hyphens from a word (e.g., "senti-mentale" -> "sentimentale")
 */
export function getWithoutHyphens(word: string): string {
  return word.replace(/-/g, '');
}
