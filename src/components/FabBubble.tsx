import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface FabBubbleProps {
  icon: IoniconName;
  text: string;
  onPress: () => void;
  tailPosition?: 'left' | 'right';
  bottom?: number;
  left?: number;
  right?: number;
}

export default function FabBubble({
  icon,
  text,
  onPress,
  tailPosition = 'left',
  bottom = 0,
  left,
  right,
}: FabBubbleProps) {
  return (
    <View
      style={[
        styles.fab,
        { bottom },
        left !== undefined && { left },
        right !== undefined && { right },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity style={styles.fabBubble} onPress={onPress} activeOpacity={0.8}>
        <Ionicons name={icon} size={22} color={Colors.white} />
        <Text style={styles.fabText}>{text}</Text>
      </TouchableOpacity>
      <View
        style={[
          styles.fabTail,
          tailPosition === 'right' && styles.fabTailRight,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    alignItems: 'flex-start',
  },
  fabBubble: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  fabTail: {
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.primary,
    marginLeft: 18,
  },
  fabTailRight: {
    alignSelf: 'flex-end',
    marginLeft: 0,
    marginRight: 18,
  },
  fabText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
