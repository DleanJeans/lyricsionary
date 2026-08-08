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
}

function TranslationLine({
  text,
  fontSize,
  isBlurred,
  onPress,
}: {
  text: string;
  fontSize: number;
  isBlurred: boolean;
  onPress: () => void;
}) {
  if (!text) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={isBlurred ? 0.7 : 1}
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
        {text}
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
  blurredText: {
    filter: 'blur(5px)',
  },
});
