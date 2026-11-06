import React, { ReactNode } from 'react';
import { LayoutChangeEvent, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const APPEAR_MS = 220;
const APPEAR_OFFSET = -8;

/**
 * Slides to its content's height when the content grows or shrinks, e.g. a quiz showing up, so what's
 * below moves smoothly. The content keeps its size and is uncovered or clipped as the height changes.
 * With appear, it also opens from nothing when first shown, its content fading in and settling down a few
 * pixels; otherwise the first height is taken as is.
 */
export default function AnimatedHeight({ children, appear = false }: { children: ReactNode; appear?: boolean }) {
  const height = useSharedValue<number | null>(null);
  const shown = useSharedValue(appear ? 0 : 1);
  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.height;
    if (height.value === null && appear) {
      const easing = Easing.out(Easing.cubic);
      height.value = 0;
      height.value = withTiming(next, { duration: APPEAR_MS, easing });
      shown.value = withTiming(1, { duration: APPEAR_MS, easing });
      return;
    }
    height.value = height.value === null ? next : withTiming(next, { duration: 250 });
  };
  const style = useAnimatedStyle(() => (height.value === null ? {} : { height: height.value }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * APPEAR_OFFSET }],
  }));
  return (
    <Animated.View style={[styles.clip, style]}>
      <Animated.View style={[styles.content, contentStyle]} onLayout={onLayout}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  // Lays out at its own height, not the animated one
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
