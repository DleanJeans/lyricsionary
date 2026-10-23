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

const WORD_CHAR = /[\p{L}\p{N}]/u;

// Curly apostrophes and quotes count as straight ones; same length, so indexes still line up.
function normalize(text: string): string {
  return text.toLowerCase().replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"');
}

// The whole definition first, then each part of a list like "to have; 've got".
function candidatesOf(definition: string): string[] {
  const whole = definition.replace(/\([^)]*\)/g, ' ').trim();
  const parts = whole.split(/[,;/]/).map((part) => part.trim());
  return [whole, ...parts].filter(Boolean);
}

// Finds the first definition that appears in the translation as whole words.
// An edge that isn't a letter, like the apostrophe in "'ve got", can sit inside a word ("I've got").
function findHighlight(text: string, definitions: string[]): [number, number] | null {
  const haystack = normalize(text);
  for (const definition of definitions) {
    for (const candidate of candidatesOf(definition)) {
      const needle = normalize(candidate);
      const checkBefore = WORD_CHAR.test(needle[0]);
      const checkAfter = WORD_CHAR.test(needle[needle.length - 1]);
      let index = haystack.indexOf(needle);
      while (index >= 0) {
        const before = haystack[index - 1];
        const after = haystack[index + needle.length];
        const okBefore = !checkBefore || !before || !WORD_CHAR.test(before);
        const okAfter = !checkAfter || !after || !WORD_CHAR.test(after);
        if (okBefore && okAfter) return [index, index + needle.length];
        index = haystack.indexOf(needle, index + 1);
      }
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
