import React, { ReactNode } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Slides to its content's height when the content grows or shrinks, e.g. a quiz showing up, so what's
 * below moves smoothly. The content keeps its size and is uncovered or clipped as the height changes.
 */
export default function AnimatedHeight({ children }: { children: ReactNode }) {
  const height = useSharedValue<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.height;
    // The first height is taken as is, so the content shows up without sliding open
    height.value = height.value === null ? next : withTiming(next, { duration: 250 });
  };
  const style = useAnimatedStyle(() => (height.value === null ? {} : { height: height.value }));
  return (
    <Animated.View style={[styles.clip, style]}>
      <View style={styles.content} onLayout={onLayout}>
        {children}
      </View>
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
