import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Colors } from '../constants/theme';

interface PullUpSheetProps {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  // Height of the part that peeks above the bottom while the sheet is down: the handle and `top`
  peekHeight: number;
  // Always shown at the top of the sheet, e.g. tabs; dragging it moves the sheet
  top: React.ReactNode;
  // Fills the rest of the sheet once it's up; kept mounted while it's down
  sheet: React.ReactNode;
  // What the sheet covers when it's up
  children: React.ReactNode;
}

// A sheet that peeks at the bottom of its parent and slides up to fill it, by a drag on its top or by
// `expanded` changing
export default function PullUpSheet({ expanded, onExpandedChange, peekHeight, top, sheet, children }: PullUpSheetProps) {
  const [height, setHeight] = useState(0);
  const travel = Math.max(0, height - peekHeight);
  // 0 is down, 1 is up
  const progress = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const progressValue = useRef(expanded ? 1 : 0);
  const dragStart = useRef(0);
  const travelRef = useRef(travel);
  travelRef.current = travel;
  const onExpandedChangeRef = useRef(onExpandedChange);
  onExpandedChangeRef.current = onExpandedChange;
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      progressValue.current = value;
    });
    return () => progress.removeListener(id);
  }, [progress]);

  const snap = (up: boolean) => {
    Animated.spring(progress, { toValue: up ? 1 : 0, useNativeDriver: true, bounciness: 0, speed: 18 }).start();
  };

  useEffect(() => {
    snap(expanded);
  }, [expanded]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Taps still reach the tabs; only a vertical drag moves the sheet
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => {
          progress.stopAnimation();
          dragStart.current = progressValue.current;
        },
        onPanResponderMove: (_, g) => {
          if (travelRef.current <= 0) return;
          progress.setValue(Math.max(0, Math.min(1, dragStart.current - g.dy / travelRef.current)));
        },
        onPanResponderRelease: (_, g) => {
          const up = g.vy < -0.3 ? true : g.vy > 0.3 ? false : progressValue.current > 0.5;
          if (up === expandedRef.current) snap(up);
          else onExpandedChangeRef.current(up);
        },
        onPanResponderTerminate: () => snap(expandedRef.current),
      }),
    [progress]
  );

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [travel, 0] });

  return (
    <View style={styles.container} onLayout={(e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height)}>
      {children}
      {height > 0 && (
        <Animated.View style={[styles.sheet, { height, transform: [{ translateY }] }]}>
          <View {...panResponder.panHandlers} style={{ height: peekHeight }}>
            <View style={styles.handle} />
            {top}
          </View>
          <View style={styles.body}>{sheet}</View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    marginTop: 8,
    marginBottom: 8,
  },
  body: {
    flex: 1,
  },
});
