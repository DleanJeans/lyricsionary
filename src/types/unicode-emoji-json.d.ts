declare module 'unicode-emoji-json/data-by-emoji' {
  export interface UnicodeEmojiData {
    name: string;
    slug: string;
    group: string;
    emoji_version: string;
    unicode_version: string;
    skin_tone_support: boolean;
  }
  const data: Record<string, UnicodeEmojiData>;
  export default data;
}
