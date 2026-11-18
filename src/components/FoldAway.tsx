import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, View } from 'react-native';

/** Swipe handlers for a bar: what an upward and a downward swipe do */
export function useSwipe(onUp: () => void, onDown: () => void) {
  const latest = useRef({ onUp, onDown });
  latest.current = { onUp, onDown };
  return useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderRelease: (_e, g) => {
        if (g.dy < -20) latest.current.onUp();
        else if (g.dy > 20) latest.current.onDown();
      },
    })
  ).current;
}

/** Slides its children under whatever is above it while collapsed, and back out when not */
export default function FoldAway({ collapsed, onSwipeUp, onSwipeDown, children }: { collapsed: boolean; onSwipeUp?: () => void; onSwipeDown?: () => void; children: React.ReactNode }) {
  const open = useRef(new Animated.Value(1)).current;
  const [height, setHeight] = useState<number | null>(null);
  const swipe = useSwipe(() => onSwipeUp?.(), () => onSwipeDown?.());
  useEffect(() => {
    Animated.timing(open, { toValue: collapsed ? 0 : 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [collapsed, open]);
  return (
    <Animated.View
      style={{
        overflow: 'hidden',
        opacity: open,
        height: height === null ? undefined : open.interpolate({ inputRange: [0, 1], outputRange: [0, height] }),
      }}
      pointerEvents={collapsed ? 'none' : 'auto'}
      {...(onSwipeUp || onSwipeDown ? swipe.panHandlers : {})}
    >
      <View
        style={height === null ? undefined : { position: 'absolute', left: 0, right: 0, top: 0 }}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      >
        {children}
      </View>
    </Animated.View>
  );
}
