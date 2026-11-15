import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { PanResponder, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Colors } from '../constants/theme';

// How much of the screen the sheet can take, resting and dragged up
const RESTING = 0.45;
const EXPANDED = 0.8;
// How far the handle is dragged before it counts
const DRAG = 40;

/**
 * Learn on a phone: the word card sits in a sheet under the lyrics instead of above them, so nothing above
 * the lyrics moves and they keep most of the screen. It takes at most about half the screen and scrolls
 * inside; dragging its handle up gives it more room, and dragging it down closes it.
 */
export default function WordSheet({ children, onClose, resetKey }: { children: ReactNode; onClose?: () => void; resetKey?: string | null }) {
  const { height } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  // A new word opens resting
  useEffect(() => setExpanded(false), [resetKey]);

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
    <View style={styles.sheet}>
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
      <ScrollView
        style={{ maxHeight: height * (expanded ? EXPANDED : RESTING) }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
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
