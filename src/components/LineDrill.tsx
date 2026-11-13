import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { lineDrillPieces, shufflePieces } from '../utils/lineDrill';
import { Text } from './Text';

/** Rebuild a lyric line by tapping its shuffled words in order */
export default function LineDrill({ line, hint, onDone }: { line: string; hint?: string; /** Told once the line is rebuilt */ onDone?: () => void }) {
  const [pieces] = useState(() => lineDrillPieces(line));
  // Indexes into pieces, in the shuffled order shown
  const [order, setOrder] = useState(() => shufflePieces(pieces));
  const [placed, setPlaced] = useState<number[]>([]);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const done = placed.length === pieces.length;
  useEffect(() => {
    if (done) onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const tap = (index: number) => {
    // Any copy of the next word counts, e.g. either "la" in "la la"
    if (pieces[index].toLowerCase() === pieces[placed.length].toLowerCase()) {
      setPlaced((prev) => [...prev, index]);
      setWrongIndex(null);
    } else {
      setWrongIndex(index);
      setMistakes((m) => m + 1);
    }
  };

  const restart = () => {
    setOrder(shufflePieces(pieces));
    setPlaced([]);
    setWrongIndex(null);
    setMistakes(0);
  };

  return (
    <View style={styles.container}>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.built}>
        {placed.length === 0 ? (
          <Text style={styles.placeholder}>Tap the words in order</Text>
        ) : (
          <Text style={[styles.builtText, done && styles.builtDone]}>{placed.map((i) => pieces[i]).join(' ')}</Text>
        )}
      </View>
      <View style={styles.pieces}>
        {order.map((index) =>
          placed.includes(index) ? null : (
            <TouchableOpacity
              key={index}
              style={[styles.piece, wrongIndex === index && styles.pieceWrong]}
              onPress={() => tap(index)}
              accessibilityRole="button"
              accessibilityLabel={pieces[index]}
            >
              <Text style={styles.pieceText}>{pieces[index]}</Text>
            </TouchableOpacity>
          )
        )}
      </View>
      {done && (
        <View style={styles.result}>
          <Text style={styles.resultText}>
            {mistakes === 0 ? 'Perfect!' : `Done, with ${mistakes} ${mistakes === 1 ? 'slip' : 'slips'}`}
          </Text>
          <TouchableOpacity onPress={restart} hitSlop={8} accessibilityRole="button" accessibilityLabel="Again">
            <View style={styles.again}>
              <Ionicons name="refresh" size={14} color={Colors.primary} />
              <Text style={styles.againText}>Again</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  hint: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  built: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  placeholder: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  builtText: {
    fontSize: 17,
    color: Colors.text,
  },
  builtDone: {
    color: Colors.success,
    fontWeight: '600',
  },
  pieces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  piece: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceLight,
  },
  pieceWrong: {
    borderColor: Colors.danger,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
  },
  pieceText: {
    fontSize: 15,
    color: Colors.text,
  },
  result: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  again: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  againText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});
