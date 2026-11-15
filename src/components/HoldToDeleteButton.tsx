import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import { Text } from './Text';

const HOLD_MS = 800;

interface HoldToDeleteButtonProps {
  onDelete: () => void;
  accessibilityLabel: string;
}

/**
 * The red button behind a swiped word card. It deletes only once it's held until it fills up, so a
 * stray tap doesn't; a tap shakes it and says to hold.
 */
export default function HoldToDeleteButton({ onDelete, accessibilityLabel }: HoldToDeleteButtonProps) {
  const fill = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const done = useRef(false);
  const [hint, setHint] = useState(false);
  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => setHint(false), 1500);
    return () => clearTimeout(timer);
  }, [hint]);

  const start = () => {
    done.current = false;
    Animated.timing(fill, { toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => {
      if (!finished) return;
      done.current = true;
      onDelete();
      fill.setValue(0);
    });
  };
  const release = () => {
    if (done.current) return;
    fill.stopAnimation();
    Animated.timing(fill, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };
  const tapped = () => {
    if (done.current) return;
    setHint(true);
    Animated.sequence(
      [6, -6, 4, -4, 0].map((toValue) => Animated.timing(shake, { toValue, duration: 45, useNativeDriver: true })),
    ).start();
  };

  return (
    <Pressable
      style={styles.button}
      onPressIn={start}
      onPressOut={release}
      onPress={tapped}
      // A hold is the whole point, so a long press mustn't cancel the tap handling
      delayLongPress={HOLD_MS * 4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Hold to delete"
      // Screen readers can't hold, so their double tap deletes
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'activate' && onDelete()}
      accessibilityActions={[{ name: 'activate' }]}
    >
      <Animated.View
        style={[styles.fill, { height: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
      />
      <Animated.View style={[styles.content, { transform: [{ translateX: shake }] }]}>
        <Ionicons name="trash" size={22} color={Colors.white} />
        <Text style={styles.text}>{hint ? 'Hold to\ndelete' : 'Hold'}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 92,
    marginBottom: 10,
    marginLeft: 8,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#5A2530',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.danger,
  },
  content: {
    alignItems: 'center',
    gap: 2,
  },
  text: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
