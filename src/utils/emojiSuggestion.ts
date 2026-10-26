// Finds an emoji for a definition from the emoji picker's names and keywords
interface EmojiEntry {
  emoji: string;
  name: string;
  keywords?: string[];
}

interface EmojiCategory {
  data: EmojiEntry[];
}

interface IndexedEmoji {
  emoji: string;
  name: string;
  nameWords: Set<string>;
  lastNameWord: string;
  keywords: Set<string>;
  stems: Set<string>;
  isCat: boolean;
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'to', 'of', 'be', 'in', 'on', 'at', 'for', 'with', 'and', 'or', 'by', 'from',
  'one', 'someone', 'something', 'sb', 'sth', 'oneself', 'is', 'are', 'it', 'its', 'my', 'your',
]);

// Keywords that fit too many emojis to say anything about a word
const GENERIC_KEYWORDS = new Set(['face', 'animal', 'cats', 'symbol', 'object', 'nature', 'person', 'human']);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .split(/[^\p{L}\p{N}']+/u)
    .filter((w) => w && !STOP_WORDS.has(w));
}

// Rough stem so cats, dancing and danced match cat and dance
function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  for (const suffix of ['ing', 'ed', 'es', 's', 'e']) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) return word.slice(0, -suffix.length);
  }
  return word;
}

const indexes = new WeakMap<EmojiCategory[], IndexedEmoji[]>();

function indexOf(categories: EmojiCategory[]): IndexedEmoji[] {
  let index = indexes.get(categories);
  if (!index) {
    index = categories.flatMap((category) =>
      category.data.map((entry) => {
        const nameWordList = words(entry.name);
        const nameWords = new Set(nameWordList);
        // The first keyword is the name as a slug
        const isCat = (entry.keywords ?? []).includes('cats');
        const keywords = new Set((entry.keywords ?? []).slice(1).map((k) => k.toLowerCase()).filter((k) => !GENERIC_KEYWORDS.has(k)));
        const stems = new Set([...nameWords, ...keywords].map(stem));
        return { emoji: entry.emoji, name: entry.name.toLowerCase(), nameWords, lastNameWord: nameWordList[nameWordList.length - 1], keywords, stems, isCat };
      })
    );
    indexes.set(categories, index);
  }
  return index;
}

export function suggestEmoji(definition: string, categories: EmojiCategory[]): string | null {
  const phrase = words(definition).join(' ');
  const definitionWords = phrase.split(' ').filter(Boolean);
  if (definitionWords.length === 0) return null;

  let best: string | null = null;
  let bestScore = 0;
  for (const entry of indexOf(categories)) {
    let score = entry.name === phrase ? 10 : 0;
    for (const word of definitionWords) {
      // The last word of a name is usually what it shows, like the moon in crescent moon
      if (entry.nameWords.has(word)) score += entry.lastNameWord === word ? 4 : 3;
      else if (entry.keywords.has(word)) score += 2;
      else if (entry.stems.has(stem(word))) score += 1;
    }
    if (score === 0) continue;
    // The cat faces copy the smileys, which fit better unless it's about cats
    if (entry.isCat && !definitionWords.some((word) => stem(word) === 'cat')) score -= 1.5;
    // A shorter name is a closer match
    score -= entry.name.length * 0.01;
    if (score > bestScore) {
      best = entry.emoji;
      bestScore = score;
    }
  }
  return bestScore > 0.5 ? best : null;
}
