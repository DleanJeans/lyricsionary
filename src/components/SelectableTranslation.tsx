import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Text } from './Text';
import { Colors } from '../constants/theme';

interface SelectableTranslationProps {
  translation: string;
  onSelect: (text: string) => void;
  // The current definition; the highlight stays only while it still matches.
  value?: string;
  style?: StyleProp<TextStyle>;
}

interface WordRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const EDGE_PUNCTUATION = /^[\s"'“”‘’«»„.,;:!?¡¿()[\]{}…\-–—]+|[\s"'“”‘’«»„.,;:!?¡¿()[\]{}…\-–—]+$/g;

function findWordIndex(rects: (WordRect | undefined)[], x: number, y: number): number {
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
export default function SelectableTranslation({ translation, onSelect, value, style }: SelectableTranslationProps) {
  const words = useMemo(() => translation.split(/\s+/).filter(Boolean), [translation]);
  const rects = useRef<(WordRect | undefined)[]>([]);
  const dragStart = useRef(-1);
  const [selection, setSelection] = useState<[number, number] | null>(null);
  const [dragging, setDragging] = useState(false);

  const textOf = (start: number, end: number) => {
    const [from, to] = start <= end ? [start, end] : [end, start];
    return words.slice(from, to + 1).join(' ').replace(EDGE_PUNCTUATION, '');
  };

  const commit = (start: number, end: number) => {
    const text = textOf(start, end);
    if (text) onSelect(text);
  };

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((event, success) => {
      if (!success) return;
      const index = findWordIndex(rects.current, event.x, event.y);
      if (index < 0) return;
      setSelection([index, index]);
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
      if (index >= 0) setSelection([index, findWordIndex(rects.current, event.x, event.y)]);
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

  const showSelection = selection && (dragging || value === undefined || textOf(selection[0], selection[1]) === value);
  const [from, to] = showSelection
    ? selection[0] <= selection[1] ? selection : [selection[1], selection[0]]
    : [-1, -1];
  const flatStyle = StyleSheet.flatten([styles.text, style]);

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View style={styles.container} accessibilityHint="Tap or drag across words to use them as the definition">
        {words.map((word, index) => (
          <View
            key={index}
            onLayout={(event) => {
              rects.current[index] = event.nativeEvent.layout;
            }}
            style={[
              styles.word,
              index >= from && index <= to && styles.wordSelected,
              index === from && styles.wordSelectedStart,
              index === to && styles.wordSelectedEnd,
            ]}
          >
            <Text style={[flatStyle, index >= from && index <= to && styles.textSelected]}>{word}</Text>
          </View>
        ))}
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
});
