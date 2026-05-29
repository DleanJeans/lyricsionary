import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from './Text';
import Animated, {
  SlideInDown,
  SlideOutDown,
  LinearTransition,
} from 'react-native-reanimated';
import { Colors } from '../constants/theme';

interface ToastProps {
  message: string | React.ReactNode;
  onUndo?: () => void;
}

export default function Toast({ message, onUndo }: ToastProps) {
  return (
    <Animated.View
      entering={SlideInDown.duration(500)}
      exiting={SlideOutDown.duration(500)}
      layout={LinearTransition.duration(250)}
      style={styles.container}
    >
      <Text style={styles.text}>{message}</Text>
      {onUndo && (
        <TouchableOpacity onPress={onUndo} style={styles.undoButton}>
          <Text style={styles.undoText}>UNDO</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    color: Colors.text,
    fontSize: 14,
    flex: 1,
  },
  undoButton: {
    marginLeft: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  undoText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});
