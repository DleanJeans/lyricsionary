import React, { useEffect, useMemo, useRef, type ReactNode } from 'react';
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
  /** Made offline for a song in Cyrillic, Greek, Korean, Hindi or Arabic without a Romanized version */
  romanized?: string;
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
  /** Translations show and each original line is blurred until tapped, to recall it from the meaning */
  reverse?: boolean;
  revealedOriginals?: Set<number>;
  onRevealOriginal?: (lineIndex: number) => void;
  /** Scrolls the line into view each time key changes */
  scrollToLine?: { index: number; key: number } | null;
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
  reverse = false,
  revealedOriginals,
  onRevealOriginal,
}: LearnLyricsViewProps & {
  line: LearnLine;
  lineIndex: number;
}) {
  const shown = showTranslations
    ? line.translations.filter((translation) => translation.show && selectedLanguages.includes(translation.language))
    : [];
  // The romanized line reads the original out, so it sits right under it and is never blurred
  const romanized = shown.find((translation) => isRomanized(translation.language))?.text ||
    (showTranslations ? line.romanized : undefined);
  // Reversed, a line with a translation to go from is hidden until tapped, its romanization with it
  const hidden = reverse && !!line.original.trim() && !revealedOriginals?.has(lineIndex) &&
    shown.some((translation) => !isRomanized(translation.language) && translation.text.trim());
  return (
    <View style={styles.lineBlock}>
      {hidden ? (
        <TouchableOpacity
          onPress={() => onRevealOriginal?.(lineIndex)}
          activeOpacity={0.7}
          style={[styles.translationContainer, styles.blurredContainer]}
          accessibilityRole="button"
          accessibilityLabel="Show the original line"
        >
          <View pointerEvents="none" style={styles.blurredText}>
            {renderPressableText(line.original, lineIndex)}
          </View>
        </TouchableOpacity>
      ) : (
        renderPressableText(line.original, lineIndex)
      )}
      {!!romanized && !hidden && (
        <Text style={[styles.romanizedLine, { fontSize: fontSize - 2 }]}>{romanized}</Text>
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
              isBlurred={!reverse && blurTranslations && !unblurredTranslations.has(translationKey)}
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
  const { lines, showSections, scrollToLine } = props;
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const lineRefs = useRef(new Map<number, View>());

  useEffect(() => {
    if (!scrollToLine) return;
    // After the lines have laid out
    const timer = setTimeout(() => {
      const line = lineRefs.current.get(scrollToLine.index);
      if (!line || !contentRef.current) return;
      line.measureLayout(contentRef.current, (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true }));
    }, 100);
    return () => clearTimeout(timer);
  }, [scrollToLine]);

  const originals = lines.map((line) => line.original).join('\n');
  const sections = useMemo(
    () => (showSections ? detectSongSections(originals.split('\n')) : []),
    [originals, showSections]
  );

  const renderLine = (lineIndex: number) => (
    <View
      key={lineIndex}
      collapsable={false}
      ref={(view) => {
        if (view) lineRefs.current.set(lineIndex, view);
        else lineRefs.current.delete(lineIndex);
      }}
    >
      <LearnLyricsLine {...props} line={lines[lineIndex]} lineIndex={lineIndex} />
    </View>
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
      ref={scrollRef}
      style={styles.lyricsScroll}
      contentContainerStyle={styles.lyricsContent}
    >
      <View ref={contentRef} collapsable={false}>
        {content}
      </View>
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
