import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleProp, StyleSheet, ViewStyle } from 'react-native';

/**
 * A row that keeps its content on one line: when it's wider than the room it has, it slowly scrolls to
 * the end and back (and can also be dragged), so a long song and artist name can be read in full
 */
export default function MarqueeRow({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const scroll = useRef<ScrollView>(null);
  const offset = useRef(new Animated.Value(0)).current;
  const [room, setRoom] = useState(0);
  const [width, setWidth] = useState(0);
  const touched = useRef(false);
  const overflow = width - room;

  useEffect(() => {
    const id = offset.addListener(({ value }) => scroll.current?.scrollTo({ x: value, animated: false }));
    return () => offset.removeListener(id);
  }, [offset]);

  useEffect(() => {
    if (overflow <= 1 || touched.current) return;
    const duration = Math.max(1500, overflow * 30);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(offset, { toValue: overflow, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.delay(1200),
        Animated.timing(offset, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [overflow, offset]);

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scroll, style]}
      contentContainerStyle={styles.content}
      onLayout={(event) => setRoom(event.nativeEvent.layout.width)}
      onContentSizeChange={(w) => setWidth(w)}
      onScrollBeginDrag={() => {
        touched.current = true;
        offset.stopAnimation();
      }}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
