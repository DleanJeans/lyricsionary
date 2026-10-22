import React, { type ReactNode } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';
import { Text } from './Text';

export interface LearnLine {
  original: string;
  translations: {
    language: string;
    text: string;
    show: boolean;
  }[];
}

interface LearnLyricsViewProps {
  lines: LearnLine[];
  fontSize: number;
  showTranslations: boolean;
  selectedLanguages: string[];
  blurTranslations: boolean;
  unblurredTranslations: Set<string>;
  renderPressableText: (text: string, lineIndex: number) => ReactNode;
  onTranslationPress: (lineIndex: number, translationIndex: number) => void;
  highlightLineIndex?: number | null;
  highlightDefinitions?: string[];
}

// Finds the first definition that appears in the translation as whole words.
function findHighlight(text: string, definitions: string[]): [number, number] | null {
  const lower = text.toLowerCase();
  for (const definition of definitions) {
    const needle = definition.trim().toLowerCase();
    let index = lower.indexOf(needle);
    while (index >= 0) {
      const before = lower[index - 1];
      const after = lower[index + needle.length];
      const isBoundary = (char?: string) => !char || !/[\p{L}\p{N}]/u.test(char);
      if (isBoundary(before) && isBoundary(after)) return [index, index + needle.length];
      index = lower.indexOf(needle, index + 1);
    }
  }
  return null;
}

function TranslationLine({
  text,
  fontSize,
  isBlurred,
  onPress,
  highlightDefinitions,
}: {
  text: string;
  fontSize: number;
  isBlurred: boolean;
  onPress: () => void;
  highlightDefinitions?: string[];
}) {
  if (!text) return null;

  const highlight = !isBlurred && highlightDefinitions?.length
    ? findHighlight(text, highlightDefinitions)
    : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={isBlurred ? 0.7 : 1}
      style={[styles.translationContainer, isBlurred && styles.blurredContainer]}
    >
      <Text
        style={[
          styles.translationLine,
          {
            fontSize: fontSize - 2,
          },
          isBlurred && styles.blurredText,
        ]}
      >
        {highlight ? (
          <>
            {text.slice(0, highlight[0])}
            <Text style={[styles.highlightedText, { fontSize: fontSize - 2 }]}>
              {text.slice(highlight[0], highlight[1])}
            </Text>
            {text.slice(highlight[1])}
          </>
        ) : text}
      </Text>
    </TouchableOpacity>
  );
}

function LearnLyricsLine({
  line,
  lineIndex,
  fontSize,
  showTranslations,
  selectedLanguages,
  blurTranslations,
  unblurredTranslations,
  renderPressableText,
  onTranslationPress,
  highlightLineIndex,
  highlightDefinitions,
}: LearnLyricsViewProps & {
  line: LearnLine;
  lineIndex: number;
}) {
  return (
    <View style={styles.lineBlock}>
      {renderPressableText(line.original, lineIndex)}
      {showTranslations &&
        line.translations
          .filter((translation) => translation.show && selectedLanguages.includes(translation.language))
          .map((translation, translationIndex) => {
            const translationKey = `${lineIndex}-${translationIndex}`;
            return (
              <TranslationLine
                key={translationIndex}
                text={translation.text}
                fontSize={fontSize}
                isBlurred={blurTranslations && !unblurredTranslations.has(translationKey)}
                onPress={() => onTranslationPress(lineIndex, translationIndex)}
                highlightDefinitions={lineIndex === highlightLineIndex ? highlightDefinitions : undefined}
              />
            );
          })}
    </View>
  );
}

export default function LearnLyricsView(props: LearnLyricsViewProps) {
  return (
    <ScrollView
      style={styles.lyricsScroll}
      contentContainerStyle={styles.lyricsContent}
    >
      {props.lines.map((line, lineIndex) => (
        <LearnLyricsLine
          key={lineIndex}
          {...props}
          line={line}
          lineIndex={lineIndex}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  lyricsScroll: {
    flex: 1,
  },
  lyricsContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  lineBlock: {
    marginBottom: 6,
  },
  translationLine: {
    color: Colors.primaryLight,
    marginTop: 2,
  },
  translationContainer: {
    alignSelf: 'flex-start',
    marginHorizontal: -4,
    paddingHorizontal: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  blurredContainer: {
    backgroundColor: Colors.surfaceLight,
  },
  highlightedText: {
    color: Colors.text,
    backgroundColor: 'rgba(108, 92, 231, 0.45)',
  },
  blurredText: {
    filter: 'blur(5px)',
  },
});
