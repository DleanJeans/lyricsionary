import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface IconButtonProps {
  icon: IoniconName;
  label: string;
  onPress: () => void;
  color?: string;
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function IconButton({
  icon,
  label,
  onPress,
  color,
  selected = false,
  disabled = false,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        selected && styles.selected,
        style,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        disabled,
        selected,
      }}
    >
      <Ionicons
        name={icon}
        size={22}
        color={color ?? (selected ? Colors.primary : Colors.textMuted)}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  selected: {
    backgroundColor: Colors.primary + '18',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.45,
  },
});
