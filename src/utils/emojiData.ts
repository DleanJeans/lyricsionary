import type { EmojisByCategory } from 'rn-emoji-keyboard';
import unicodeData from 'unicode-emoji-json/data-by-emoji';

interface EmojiItem {
  emoji: string;
  name: string;
  v: string;
  toneEnabled: boolean;
}

const GROUP_TO_CATEGORY: Record<string, EmojisByCategory['title']> = {
  'Smileys & Emotion': 'smileys_emotion',
  'People & Body': 'people_body',
  'Animals & Nature': 'animals_nature',
  'Food & Drink': 'food_drink',
  'Travel & Places': 'travel_places',
  Activities: 'activities',
  Objects: 'objects',
  Symbols: 'symbols',
  Flags: 'flags',
};

type UnicodeEmojiEntry = {
  name: string;
  slug: string;
  group: string;
  emoji_version: string;
  unicode_version: string;
  skin_tone_support: boolean;
};

function buildEmojiData(): EmojisByCategory[] {
  const groups = new Map<EmojisByCategory['title'], EmojiItem[]>();

  for (const [emojiChar, entry] of Object.entries(unicodeData as Record<string, UnicodeEmojiEntry>)) {
    const category = GROUP_TO_CATEGORY[entry.group];
    if (!category) continue;

    if (!groups.has(category)) {
      groups.set(category, []);
    }

    groups.get(category)!.push({
      emoji: emojiChar,
      name: entry.name,
      v: entry.emoji_version,
      toneEnabled: entry.skin_tone_support,
    });
  }

  const categoryOrder: EmojisByCategory['title'][] = [
    'smileys_emotion',
    'people_body',
    'animals_nature',
    'food_drink',
    'travel_places',
    'activities',
    'objects',
    'symbols',
    'flags',
  ];

  return categoryOrder
    .filter(cat => groups.has(cat))
    .map(title => ({
      title,
      data: groups.get(title)!,
    }));
}

export const emojiData = buildEmojiData();
