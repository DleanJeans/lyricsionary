import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Text } from './Text';
import { Colors } from '../constants/theme';
import { findDefinitionHighlight, findDefinitionHighlightAt, withWordForms } from '../utils/definitionHighlight';
import { splitDashedWords } from '../utils/cleanLyrics';

interface SelectableTranslationProps {
  translation: string;
  // The picked words and where they start in the translation
  onSelect: (text: string, at: number) => void;
  // The current definition, highlighted where it appears in the translation.
  value?: string;
  // Where the definition was picked, so a word that's there twice highlights the one tapped
  valueAt?: number;
  style?: StyleProp<TextStyle>;
}

export interface WordRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const EDGE_PUNCTUATION = /^[\s"'“”‘’«»„.,;:!?¡¿()[\]{}…\-–—]+|[\s"'“”‘’«»„.,;:!?¡¿()[\]{}…\-–—]+$/g;

export function findWordIndex(rects: (WordRect | undefined)[], x: number, y: number): number {
  let best = -1;
  let bestDistance = Infinity;
  rects.forEach((rect, index) => {
    if (!rect) return;
    // Rows matter more than columns so a drag stays on the line under the finger.
    const dx = x < rect.x ? rect.x - x : x > rect.x + rect.width ? x - rect.x - rect.width : 0;
    const dy = y < rect.y ? rect.y - y : y > rect.y + rect.height ? y - rect.y - rect.height : 0;
    const distance = dy * 10 + dx;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

// Tap a word, or drag across several, to pick it as the definition.
export default function SelectableTranslation({ translation, onSelect, value, valueAt, style }: SelectableTranslationProps) {
  // Each word with its start offset in the translation, to map a highlight onto words.
  // Words split at spaces and dashes, so "desk chair" can be picked from "desk chair—even"
  const tokens = useMemo(() => splitDashedWords(translation), [translation]);
  const rects = useRef<(WordRect | undefined)[]>([]);
  const dragStart = useRef(-1);
  const [selection, setSelection] = useState<[number, number] | null>(null);
  const [dragging, setDragging] = useState(false);

  const commit = (start: number, end: number) => {
    const [from, to] = start <= end ? [start, end] : [end, start];
    // As written between the words, so "chair—even" isn't picked as "chair— even"
    const joined = translation.slice(tokens[from].start, tokens[to].start + tokens[to].text.length).replace(/\s+/g, ' ');
    const text = joined.replace(EDGE_PUNCTUATION, '');
    // Skip the punctuation cut off the front, like the quote in "“the"
    const leading = joined.length - joined.replace(/^[\s"'“”‘’«»„.,;:!?¡¿()[\]{}…\-–—]+/, '').length;
    if (text) onSelect(text, tokens[from].start + leading);
  };

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((event, success) => {
      if (!success) return;
      const index = findWordIndex(rects.current, event.x, event.y);
      if (index < 0) return;
      commit(index, index);
    });

  // Horizontal drags select; vertical ones fall through to the scroll view.
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-8, 8])
    .failOffsetY([-12, 12])
    .onStart((event) => {
      const index = findWordIndex(rects.current, event.x - event.translationX, event.y - event.translationY);
      dragStart.current = index;
      if (index >= 0) setDragging(true);
      if (index >= 0) setSelection([index, Math.max(findWordIndex(rects.current, event.x, event.y), 0)]);
    })
    .onUpdate((event) => {
      if (dragStart.current < 0) return;
      const index = findWordIndex(rects.current, event.x, event.y);
      if (index >= 0) setSelection([dragStart.current, index]);
    })
    .onEnd((event) => {
      if (dragStart.current < 0) return;
      const index = findWordIndex(rects.current, event.x, event.y);
      commit(dragStart.current, index >= 0 ? index : dragStart.current);
    })
    .onFinalize(() => {
      dragStart.current = -1;
      setDragging(false);
    });

  // While dragging show the words under the finger, otherwise where the definition appears.
  const highlights: Array<[number, number]> | null = dragging && selection
    ? [[
        tokens[Math.min(selection[0], selection[1])].start,
        tokens[Math.max(selection[0], selection[1])].start + tokens[Math.max(selection[0], selection[1])].text.length,
      ]]
    : value
      ? (valueAt !== undefined ? findDefinitionHighlightAt(translation, value, valueAt) : null) ??
        findDefinitionHighlight(translation, withWordForms([value]))
      : null;
  const flatStyle = StyleSheet.flatten([styles.text, style]);

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View style={styles.container} accessibilityHint="Tap or drag across words to use them as the definition">
        {tokens.map((token, index) => {
          const end = token.start + token.text.length;
          // Split phrases like "give much away" have a range per word
          const highlight = highlights?.find(([start, stop]) => start < end && stop > token.start);
          const from = highlight ? Math.max(highlight[0], token.start) - token.start : 0;
          const to = highlight ? Math.min(highlight[1], end) - token.start : 0;
          const covered = from < to;
          const whole = covered && from === 0 && to === token.text.length;
          const startsRun = whole && highlight![0] >= token.start;
          const endsRun = whole && highlight![1] <= end;
          return (
            <View
              key={index}
              onLayout={(event) => {
                rects.current[index] = event.nativeEvent.layout;
              }}
              style={[
                styles.word,
                whole && styles.wordSelected,
                startsRun && styles.wordSelectedStart,
                endsRun && styles.wordSelectedEnd,
              ]}
            >
              {covered && !whole ? (
                // Part of a word, like the 've in I've
                <Text style={flatStyle}>
                  {token.text.slice(0, from)}
                  <Text style={[flatStyle, styles.textSelected, styles.partSelected]}>{token.text.slice(from, to)}</Text>
                  {token.text.slice(to)}
                </Text>
              ) : (
                <Text style={[flatStyle, whole && styles.textSelected]}>{token.text}</Text>
              )}
            </View>
          );
        })}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  word: {
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  wordSelected: {
    backgroundColor: 'rgba(108, 92, 231, 0.35)',
  },
  wordSelectedStart: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  wordSelectedEnd: {
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  text: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  textSelected: {
    color: Colors.text,
  },
  partSelected: {
    backgroundColor: 'rgba(108, 92, 231, 0.35)',
  },
});
