import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';
import { Text } from './Text';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface EmptyStateProps {
  icon: IoniconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={icon}
          size={30}
          color={Colors.primary}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          style={({ pressed }) => [
            styles.action,
            pressed && styles.actionPressed,
          ]}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={Colors.white}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: `${Colors.primary}18`,
  },
  title: {
    marginTop: 16,
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    maxWidth: 360,
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  action: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  actionPressed: {
    opacity: 0.8,
  },
  actionText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
