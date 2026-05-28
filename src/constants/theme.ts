import { StyleSheet } from 'react-native';

export const Fonts = {
  regular: 'GoogleSans',
  italic: 'GoogleSans-Italic',
};

export const Colors = {
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  secondary: '#00CEC9',
  blue: '#3498DB',
  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceLight: '#25253D',
  text: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textMuted: '#6C6C80',
  border: '#2D2D44',
  danger: '#FF6B6B',
  dangerDark: '#E74C3C',
  success: '#00B894',
  warning: '#FDCB6E',
  white: '#FFFFFF',
  // Mastery level colors
  masteryUnknown: '#FFFFFF',      // White (default)
  masteryNew: '#FF6B6B',           // Red-orange
  masteryLearning: '#FDCB6E',      // Yellow
  masteryMastered: '#00B894',      // Green
};

export const getMasteryLevelColor = (level?: 'Unknown' | 'New' | 'Learning' | 'Mastered'): string => {
  switch (level) {
    case 'New':
      return Colors.masteryNew;
    case 'Learning':
      return Colors.masteryLearning;
    case 'Mastered':
      return Colors.masteryMastered;
    case 'Unknown':
    default:
      return Colors.masteryUnknown;
  }
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
