import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { Colors } from '../constants/theme';
import type { WordProgress } from '../hooks/useWordProgress';
import IconButton from './IconButton';
import { Text } from './Text';

interface LearnActionBarProps {
  fontSize: number;
  lineCount: number;
  /** Known (saved or ignored) words out of the song's words, shown as text and a bar */
  wordProgress?: WordProgress;
  onDecreaseFontSize: () => void;
  onIncreaseFontSize: () => void;
  /** While saved words to recall are blanked out in the lyrics: ends that and shows the full lyrics */
  onShowAllLyrics?: () => void;
  /** Goes to the line with the fewest new words left, when there is one */
  onNextLine?: () => void;
  /** While filling in the lyrics: shows only the lines with words answered wrong lately */
  trickyLinesOnly?: boolean;
  onToggleTrickyLines?: () => void;
  /** One line at a time, in bigger text */
  lineByLine?: boolean;
  onToggleLineByLine?: () => void;
}

export default function LearnActionBar({
  fontSize,
  lineCount,
  wordProgress,
  onDecreaseFontSize,
  onIncreaseFontSize,
  onShowAllLyrics,
  onNextLine,
  trickyLinesOnly = false,
  onToggleTrickyLines,
  lineByLine = false,
  onToggleLineByLine,
}: LearnActionBarProps) {
  const canDecrease = fontSize > 12;
  const canIncrease = fontSize < 32;

  return (
    <View style={styles.actionBar}>
      <View style={styles.fontSizeControl}>
        <Ionicons
          name="text-outline"
          size={18}
          color={Colors.textSecondary}
        />
        <IconButton
          icon="remove"
          label="Decrease text size"
          onPress={onDecreaseFontSize}
          disabled={!canDecrease}
          style={styles.fontButton}
        />
        <Text style={styles.fontSizeText}>{fontSize}</Text>
        <IconButton
          icon="add"
          label="Increase text size"
          onPress={onIncreaseFontSize}
          disabled={!canIncrease}
          style={styles.fontButton}
        />
        {onNextLine && (
          <TouchableOpacity onPress={onNextLine} hitSlop={8} style={styles.nextLine} accessibilityRole="button" accessibilityLabel="Go to the next line to learn">
            <Ionicons name="flag-outline" size={18} color={Colors.primaryLight} />
          </TouchableOpacity>
        )}
        {onToggleLineByLine && (
          <TouchableOpacity
            onPress={onToggleLineByLine}
            hitSlop={8}
            style={[styles.nextLine, lineByLine && styles.lineByLineOn]}
            accessibilityRole="button"
            accessibilityLabel={lineByLine ? 'Show every line' : 'Line by line'}
          >
            <Ionicons name="reader-outline" size={18} color={lineByLine ? Colors.white : Colors.primaryLight} />
          </TouchableOpacity>
        )}
        {onToggleTrickyLines && (
          <TouchableOpacity
            style={[styles.quizButton, trickyLinesOnly && styles.trickyOn]}
            onPress={onToggleTrickyLines}
            accessibilityRole="button"
            accessibilityLabel={trickyLinesOnly ? 'Show every line' : 'Only lines with tricky words'}
          >
            <Ionicons name="alert-circle-outline" size={16} color={trickyLinesOnly ? Colors.white : Colors.warning} />
          </TouchableOpacity>
        )}
        {onShowAllLyrics && (
          <TouchableOpacity style={styles.quizButton} onPress={onShowAllLyrics} accessibilityRole="button">
            <Ionicons name="eye-outline" size={16} color={Colors.primary} />
            <Text style={styles.quizButtonText}>Show all</Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Beside the Show all button there's no room for one line, so the line count goes under the words */}
      <Text style={[styles.lineCounter, onShowAllLyrics && styles.lineCounterStacked]} numberOfLines={onShowAllLyrics ? 2 : 1}>
        {/* With the line by line button there's no room for the line count beside the words; line by line counts the lines */}
        {wordProgress
          ? onToggleLineByLine && !onShowAllLyrics
            ? wordProgress.label
            : `${wordProgress.label}${onShowAllLyrics ? '\n' : ' · '}${lineCount} lines`
          : `${lineCount} lines`}
      </Text>
      {wordProgress && (
        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityLabel="Known words"
          accessibilityValue={{ min: 0, max: wordProgress.total, now: wordProgress.known }}
        >
          {/* Slides to the new width as words are saved or ignored */}
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${wordProgress.percent}%`,
                transitionProperty: 'width',
                transitionDuration: 400,
                transitionTimingFunction: 'ease-out',
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trickyOn: {
    backgroundColor: Colors.warning,
    borderColor: Colors.warning,
  },
  nextLine: {
    marginLeft: 4,
    padding: 4,
  },
  lineByLineOn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fontSizeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fontButton: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quizButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    minWidth: 36,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  quizButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  fontSizeText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  // Sits on the bar's bottom border so it takes no extra height
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 3,
    backgroundColor: Colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  lineCounter: {
    flexShrink: 1,
    marginLeft: 12,
    color: Colors.textSecondary,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  lineCounterStacked: {
    textAlign: 'right',
    fontSize: 12,
  },
});
