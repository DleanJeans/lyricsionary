import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Colors } from '../constants/theme';

// How much of the screen the sheet can take, resting and dragged up
const RESTING = 0.45;
const EXPANDED = 0.8;
// How far the handle is dragged before it counts
const DRAG = 40;
// Sliding up into place, and growing or shrinking, takes a second; closing is quicker
const SLIDE_MS = 1000;
const CLOSE_MS = 250;
const easing = Easing.out(Easing.cubic);

/**
 * Learn on a phone: the word card sits in a sheet over the bottom of the lyrics instead of above them, so
 * nothing above the lyrics moves and they keep most of the screen. It slides up into place over the
 * lyrics (moving, not resizing them, so it stays smooth) and tells onHeight how much it covers once it
 * settles, for the lyrics to scroll clear of it. It takes at most about half the screen and scrolls
 * inside; dragging its handle up gives it more room, and dragging it down closes it. With closing, it
 * slides back down and calls onClosed.
 */
export default function WordSheet({
  children,
  onClose,
  resetKey,
  closing = false,
  onClosed,
  onHeight,
}: {
  children: ReactNode;
  onClose?: () => void;
  resetKey?: string | null;
  closing?: boolean;
  onClosed?: () => void;
  onHeight?: (height: number) => void;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  // A new word opens resting
  useEffect(() => setExpanded(false), [resetKey]);

  // Off screen until its height is known, then slides up from just below
  const translateY = useSharedValue(windowHeight);
  const sheetHeight = useRef(0);
  const shown = useRef(false);
  const maxHeight = useSharedValue(windowHeight * RESTING);
  useEffect(() => {
    maxHeight.value = withTiming(windowHeight * (expanded ? EXPANDED : RESTING), { duration: SLIDE_MS, easing });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, windowHeight]);

  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  useEffect(() => {
    if (!closing) {
      if (shown.current) translateY.value = withTiming(0, { duration: CLOSE_MS, easing });
      return;
    }
    translateY.value = withTiming(sheetHeight.current, { duration: CLOSE_MS, easing });
    const timer = setTimeout(() => onClosedRef.current?.(), CLOSE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  // The height it covers goes out once it stops changing, not on every frame of growing
  const heightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (heightTimer.current) clearTimeout(heightTimer.current);
    onHeightRef.current?.(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onHeightRef = useRef(onHeight);
  onHeightRef.current = onHeight;
  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    sheetHeight.current = h;
    if (!shown.current && !closing) {
      shown.current = true;
      translateY.value = h;
      translateY.value = withTiming(0, { duration: SLIDE_MS, easing });
    }
    if (heightTimer.current) clearTimeout(heightTimer.current);
    heightTimer.current = setTimeout(() => onHeightRef.current?.(sheetHeight.current), 150);
  };

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const scrollStyle = useAnimatedStyle(() => ({ maxHeight: maxHeight.value }));

  const latest = useRef({ expanded, onClose });
  latest.current = { expanded, onClose };
  const pan = useRef(
    PanResponder.create({
      // A tap goes to the handle's button; a drag is taken from it
      onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dy) > 6,
      onPanResponderRelease: (_e, g) => {
        const { expanded: up, onClose: close } = latest.current;
        if (g.dy < -DRAG) setExpanded(true);
        else if (g.dy > DRAG) {
          if (up) setExpanded(false);
          else close?.();
        }
      },
    })
  ).current;

  return (
    <Animated.View style={[styles.sheet, sheetStyle]} onLayout={onLayout}>
      <View {...pan.panHandlers}>
        <TouchableOpacity
          onPress={() => setExpanded((v) => !v)}
          style={styles.handleArea}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Make the word card smaller' : 'Make the word card bigger'}
        >
          <View style={styles.handle} />
        </TouchableOpacity>
      </View>
      <Animated.ScrollView
        style={scrollStyle}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {children}
      </Animated.ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceLight,
  },
  content: {
    paddingBottom: 8,
  },
});
