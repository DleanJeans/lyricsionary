import { StyleSheet } from 'react-native';

export const Colors = {
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  secondary: '#00CEC9',
  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceLight: '#25253D',
  text: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textMuted: '#6C6C80',
  border: '#2D2D44',
  danger: '#FF6B6B',
  success: '#00B894',
  warning: '#FDCB6E',
  white: '#FFFFFF',
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenPadding: {
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  bodyText: {
    fontSize: 16,
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: 8,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
