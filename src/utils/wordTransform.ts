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
      transforms.push(parts[0].toLowerCase(), ...parts.slice(1));
    }
  }

  // Handle hyphenated words with hyphens (e.g., "senti-mentale" -> "sentimentale")
  // Don't do this if word has an apostrophe (e.g., "qu'est-ce" should NOT become "qu'estce")
  if (hasHyphenInMiddle(word) && !word.includes("'")) {
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
  const firstChar = word[0];
  // Don't treat fully uppercase words as "capitalized" (e.g., "RER", "USA")
  if (word === word.toUpperCase() && word.length > 1) return false;
  return firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
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
    if (word.startsWith("qu'") || word.startsWith("Qu'")) {
      return word.slice(3);
    }
    return word.slice(2);
  }
  return word;
}

export function splitElisionParts(word: string): string[] | null {
  if (!hasContractedPrefix(word)) return null;

  const parts: string[] = [];
  let remaining = word;

  while (remaining.length >= 2 && contractedPrefixRegex.test(remaining)) {
    let prefixLength = 2;
    if (remaining.startsWith("qu'") || remaining.startsWith("Qu'")) {
      prefixLength = 3;
    }
    parts.push(remaining.slice(0, prefixLength));
    remaining = remaining.slice(prefixLength);
  }

  if (remaining.length > 0) {
    parts.push(remaining);
  }

  return parts.length > 1 ? parts : null;
}

/**
 * Split contracted prefix into parts.
 * Handles multiple contractions in a word.
 * Examples:
 * - "j'aime" -> ["j'", "aime"]
 * - "l'essence" -> ["l'", "essence"]
 * - "d'y" -> ["d'", "y"]
 * - "j't'aime" -> ["j'", "aime"] (skips intermediate contracted parts)
 * - "qu'est-ce" -> ["qu'", "est-ce"]
 */
export function splitContractedPrefix(word: string): string[] {
  if (!hasContractedPrefix(word)) {
    return [word];
  }

  const parts: string[] = [];

  // Handle special case "qu'" (3 characters) vs normal contractions (2 characters)
  let prefixLength = 2;
  if (word.startsWith("qu'") || word.startsWith("Qu'")) {
    prefixLength = 3;
  }

  const prefix = word.slice(0, prefixLength);
  parts.push(prefix);

  let remaining = word.slice(prefixLength);

  // Check if remaining part also has a contracted prefix (e.g., "t'aime" in "j't'aime")
  // Skip it and just get the final base word
  while (remaining.length >= 2 && contractedPrefixRegex.test(remaining)) {
    if (remaining.startsWith("qu'") || remaining.startsWith("Qu'")) {
      remaining = remaining.slice(3);
    } else {
      remaining = remaining.slice(2);
    }
  }

  if (remaining.length > 0) {
    parts.push(remaining);
  }

  return parts;
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
