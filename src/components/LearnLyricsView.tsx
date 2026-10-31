import React, { useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { isRomanized } from '../constants/languages';
import { Colors } from '../constants/theme';
import { Text } from './Text';
import { findDefinitionHighlights } from '../utils/definitionHighlight';
import { detectSongSections, type SectionKind, type SongSection } from '../utils/songSections';

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
  // One list of definitions per word to highlight, best first
  highlightDefinitions?: string[][];
  // Box and label the song's sections, like the verses and chorus
  showSections?: boolean;
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
  highlightDefinitions?: string[][];
}) {
  if (!text) return null;

  const highlights = !isBlurred && highlightDefinitions?.length
    ? findDefinitionHighlights(text, highlightDefinitions)
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
        {highlights ? (
          <>
            {highlights.map(([start, end], i) => (
              <React.Fragment key={i}>
                {text.slice(i === 0 ? 0 : highlights[i - 1][1], start)}
                <Text style={[styles.highlightedText, { fontSize: fontSize - 2 }]}>
                  {text.slice(start, end)}
                </Text>
              </React.Fragment>
            ))}
            {text.slice(highlights[highlights.length - 1][1])}
          </>
        ) : text}
      </Text>
    </TouchableOpacity>
  );
}

export function LearnLyricsLine({
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
  const shown = showTranslations
    ? line.translations.filter((translation) => translation.show && selectedLanguages.includes(translation.language))
    : [];
  // The romanized line reads the original out, so it sits right under it and is never blurred
  const romanized = shown.find((translation) => isRomanized(translation.language));
  return (
    <View style={styles.lineBlock}>
      {renderPressableText(line.original, lineIndex)}
      {!!romanized?.text && (
        <Text style={[styles.romanizedLine, { fontSize: fontSize - 2 }]}>{romanized.text}</Text>
      )}
      {shown
        .filter((translation) => !isRomanized(translation.language))
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

const SECTION_COLORS: Record<SectionKind, string> = {
  intro: Colors.blue,
  verse: Colors.textMuted,
  'pre-chorus': Colors.secondary,
  chorus: Colors.primaryLight,
  bridge: Colors.warning,
  hook: '#FD79A8',
  outro: Colors.blue,
};

function SectionBox({ section, children }: { section: SongSection; children: ReactNode }) {
  const color = SECTION_COLORS[section.kind];
  return (
    <View style={[styles.sectionBox, { borderColor: `${color}80` }]}>
      <View style={[styles.sectionLabel, { borderColor: `${color}80` }]}>
        <Text style={[styles.sectionLabelText, { color, fontSize: 11 }]}>{section.label}</Text>
      </View>
      {children}
    </View>
  );
}

export default function LearnLyricsView(props: LearnLyricsViewProps) {
  const { lines, showSections } = props;
  const originals = lines.map((line) => line.original).join('\n');
  const sections = useMemo(
    () => (showSections ? detectSongSections(originals.split('\n')) : []),
    [originals, showSections]
  );

  const renderLine = (lineIndex: number) => (
    <LearnLyricsLine
      key={lineIndex}
      {...props}
      line={lines[lineIndex]}
      lineIndex={lineIndex}
    />
  );

  // Lines inside a section go in its box, the blank lines between sections stay outside
  const content: ReactNode[] = [];
  let sectionIndex = 0;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const section = sections[sectionIndex];
    if (section?.start !== lineIndex) {
      content.push(renderLine(lineIndex));
      continue;
    }
    const sectionLines: ReactNode[] = [];
    for (let i = section.start; i <= section.end; i++) sectionLines.push(renderLine(i));
    content.push(<SectionBox key={`section-${lineIndex}`} section={section}>{sectionLines}</SectionBox>);
    lineIndex = section.end;
    sectionIndex++;
  }

  return (
    <ScrollView
      style={styles.lyricsScroll}
      contentContainerStyle={styles.lyricsContent}
    >
      {content}
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
  sectionBox: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 4,
    marginHorizontal: -10,
    paddingHorizontal: 9,
    paddingTop: 14,
    paddingBottom: 4,
  },
  sectionLabel: {
    position: 'absolute',
    top: -10,
    left: 10,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 1,
    backgroundColor: Colors.background,
  },
  sectionLabelText: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  romanizedLine: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
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
