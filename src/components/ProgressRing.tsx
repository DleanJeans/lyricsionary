import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';
import { Text } from './Text';

interface Props {
  /** 0 to 100 */
  percent: number;
  size?: number;
  thickness?: number;
  color?: string;
}

/**
 * A ring that fills clockwise from the top with the percent in the middle, drawn with plain Views
 * (two rotated half rings, each clipped to one side) so it needs no SVG library
 */
export default function ProgressRing({ percent, size = 54, thickness = 5, color = Colors.success }: Props) {
  const p = Math.max(0, Math.min(100, percent));
  const half = size / 2;
  const ring = { width: size, height: size, borderRadius: half, borderWidth: thickness };

  // One half ring, turned `degrees` clockwise into the clip on `side`
  const renderHalf = (side: 'left' | 'right', degrees: number) => (
    <View style={[styles.clip, { width: half, height: size, left: side === 'right' ? half : 0 }]}>
      <View style={{ position: 'absolute', width: size, height: size, left: side === 'right' ? -half : 0, transform: [{ rotate: `${degrees}deg` }] }}>
        <View style={[styles.clip, { width: half, height: size, left: side === 'right' ? 0 : half }]}>
          <View style={[ring, { position: 'absolute', left: side === 'right' ? 0 : -half, borderColor: color }]} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`${Math.round(p)}% of the words known`}>
      <View style={[ring, { position: 'absolute', borderColor: Colors.border }]} />
      {p > 0 && renderHalf('right', (Math.min(p, 50) / 50) * 180)}
      {p > 50 && renderHalf('left', ((p - 50) / 50) * 180)}
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.label, { fontSize: size < 48 ? 11 : 13 }]}>{Math.round(p)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
});
