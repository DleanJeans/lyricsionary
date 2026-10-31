import React from 'react';
import { StyleSheet } from 'react-native';
import { findSearchMatches } from '../utils/search';
import { Text } from './Text';

interface HighlightedTextProps {
  text: string;
  query: string;
  style: any;
  numberOfLines?: number;
}

export default function HighlightedText({
  text,
  query,
  style,
  numberOfLines,
}: HighlightedTextProps) {
  if (!query.trim()) {
    return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  }

  // Matches ignore case and accents, e.g. "corazon" highlights "Corazón"
  const parts: { text: string; highlight: boolean }[] = [];
  let lastIndex = 0;
  for (const [start, end] of findSearchMatches(text, query)) {
    if (start > lastIndex) {
      parts.push({ text: text.slice(lastIndex, start), highlight: false });
    }
    parts.push({ text: text.slice(start, end), highlight: true });
    lastIndex = end;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlight: false });
  }

  // Text sets its own font size and font on each nested Text, so the parts are given the
  // outer text's, or the highlighted part of a word title would shrink to the default size
  const flat = StyleSheet.flatten(style) ?? {};
  const font = { fontSize: flat.fontSize, fontWeight: flat.fontWeight, fontFamily: flat.fontFamily, lineHeight: flat.lineHeight };

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) => (
        <Text key={i} style={part.highlight ? [font, styles.highlight] : font}>{part.text}</Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  highlight: {
    backgroundColor: '#F5C542',
    color: '#1A1A1A',
  },
});
