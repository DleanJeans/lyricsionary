import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { isRomanized } from '../constants/languages';
import { Colors } from '../constants/theme';
import { Text } from './Text';
import { findDefinitionHighlights } from '../utils/definitionHighlight';
import { detectSongSections, type SectionKind, type SongSection } from '../utils/songSections';
import { getLineNote } from '../utils/lineNotes';
import { getScrollPosition, setScrollPosition } from '../services/scrollPositions';

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
  /**
   * Scrolls the line into view each time key changes. With center, the line is kept in the middle whenever the
   * lyrics area resizes after, e.g. as a tapped word's card opens above it or its quiz shows up, until scrolled by hand
   */
  scrollToLine?: { index: number; key: number; center?: boolean } | null;
  /** A line hidden for dictation, to write it from listening */
  dictationLineIndex?: number | null;
  /** Shows only these lines, e.g. the ones with words answered wrong lately */
  onlyLines?: Set<number> | null;
  /** A line to point out, e.g. one found by searching the lyrics */
  foundLineIndex?: number | null;
  /** The line Spotify is playing */
  playingLineIndex?: number | null;
  /** Notes on lines, by line text (Song.lineNotes) */
  lineNotes?: Record<string, string>;
  /** Remembers the scroll position under this key, e.g. the song's id, and goes back to it */
  scrollKey?: string;
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
  dictationLineIndex,
  lineNotes,
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
  const hidden = (reverse && !!line.original.trim() && !revealedOriginals?.has(lineIndex) &&
    shown.some((translation) => !isRomanized(translation.language) && translation.text.trim())) ||
    lineIndex === dictationLineIndex;
  const note = getLineNote(lineNotes, line.original);
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
          {/* Plain text, since mastery colors, IPA and emoji would hint at the words */}
          <Text style={[styles.hiddenLine, { fontSize }, styles.blurredText]}>{line.original}</Text>
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
      {!!note && !hidden && (
        <View style={styles.noteRow}>
          <Ionicons name="chatbox-ellipses-outline" size={12} color={Colors.primaryLight} style={styles.noteIcon} />
          <Text style={[styles.noteText, { fontSize: Math.max(12, fontSize - 4) }]}>{note}</Text>
        </View>
      )}
    </View>
  );
}

type LineProps = LearnLyricsViewProps & { line: LearnLine; lineIndex: number };

/**
 * Whether a line would look the same: only what concerns this line is compared, e.g. whether it's the
 * highlighted one, so answering a quiz or tapping a word redraws the lines it changes, not all of them
 */
function sameLine(prev: LineProps, next: LineProps): boolean {
  const i = next.lineIndex;
  for (const key of Object.keys(next) as (keyof LineProps)[]) {
    if (prev[key] === next[key]) continue;
    switch (key) {
      case 'highlightLineIndex':
        if ((prev.highlightLineIndex === i) !== (next.highlightLineIndex === i)) return false;
        break;
      case 'highlightDefinitions':
        if (next.highlightLineIndex === i && JSON.stringify(prev.highlightDefinitions) !== JSON.stringify(next.highlightDefinitions)) return false;
        break;
      case 'dictationLineIndex':
        if ((prev.dictationLineIndex === i) !== (next.dictationLineIndex === i)) return false;
        break;
      case 'revealedOriginals':
        if (!!prev.revealedOriginals?.has(i) !== !!next.revealedOriginals?.has(i)) return false;
        break;
      // What the view draws around the line, not the line
      case 'lines':
      case 'scrollToLine':
      case 'playingLineIndex':
      case 'foundLineIndex':
      case 'onlyLines':
      case 'scrollKey':
      case 'showSections':
        break;
      default:
        return false;
    }
  }
  return true;
}

const MemoLyricsLine = memo(LearnLyricsLine, sameLine);

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
  const { lines, showSections, scrollToLine, scrollKey } = props;
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const lineRefs = useRef(new Map<number, View>());

  // The line to keep in the middle, and how tall the lyrics area is
  const centeringRef = useRef<number | null>(null);
  const viewportHeightRef = useRef(0);
  const centerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Centers once the lyrics area stops resizing, e.g. after the word card has slid open
  const centerSoon = () => {
    if (centerTimerRef.current) clearTimeout(centerTimerRef.current);
    centerTimerRef.current = setTimeout(() => {
      const target = centeringRef.current;
      if (target === null) return;
      const line = lineRefs.current.get(target);
      if (!line || !contentRef.current) return;
      line.measureLayout(contentRef.current, (_x, y, _w, h) =>
        scrollRef.current?.scrollTo({ y: Math.max(0, y + h / 2 - viewportHeightRef.current / 2), animated: true })
      );
    }, 80);
  };
  useEffect(() => () => {
    if (centerTimerRef.current) clearTimeout(centerTimerRef.current);
  }, []);

  useEffect(() => {
    if (!scrollToLine) return;
    if (scrollToLine.center) {
      centeringRef.current = scrollToLine.index;
      centerSoon();
      return;
    }
    centeringRef.current = null;
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

  // Goes back to where the song was left, once its lines have laid out
  const restoredRef = useRef<string | null>(null);
  const restoreScroll = () => {
    if (!scrollKey || restoredRef.current === scrollKey) return;
    restoredRef.current = scrollKey;
    void getScrollPosition(scrollKey).then((y) => {
      if (y > 0) scrollRef.current?.scrollTo({ y, animated: false });
    });
  };

  // The latest handlers behind stable ones, so a line isn't redrawn just because they're made anew
  const latest = useRef(props);
  latest.current = props;
  const onTranslationPress = useCallback((lineIndex: number, translationIndex: number) => latest.current.onTranslationPress(lineIndex, translationIndex), []);
  const onRevealOriginal = useCallback((lineIndex: number) => latest.current.onRevealOriginal?.(lineIndex), []);

  const renderLine = (lineIndex: number) => props.onlyLines && !props.onlyLines.has(lineIndex) ? null : (
    <View
      key={lineIndex}
      collapsable={false}
      style={lineIndex === props.playingLineIndex ? styles.playingLine : lineIndex === props.foundLineIndex ? styles.foundLine : undefined}
      ref={(view) => {
        if (view) lineRefs.current.set(lineIndex, view);
        else lineRefs.current.delete(lineIndex);
      }}
    >
      <MemoLyricsLine
        {...props}
        onTranslationPress={onTranslationPress}
        onRevealOriginal={onRevealOriginal}
        line={lines[lineIndex]}
        lineIndex={lineIndex}
      />
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
    // A section with none of the lines shown is left out
    if (sectionLines.every((line) => line === null)) {
      lineIndex = section.end;
      sectionIndex++;
      continue;
    }
    content.push(<SectionBox key={`section-${lineIndex}`} section={section}>{sectionLines}</SectionBox>);
    lineIndex = section.end;
    sectionIndex++;
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.lyricsScroll}
      contentContainerStyle={styles.lyricsContent}
      onLayout={(event) => {
        viewportHeightRef.current = event.nativeEvent.layout.height;
        if (centeringRef.current !== null) centerSoon();
      }}
      // Scrolling by hand stops the line being brought back to the middle
      onScrollBeginDrag={() => {
        centeringRef.current = null;
      }}
      onContentSizeChange={(_w, h) => {
        if (h > 0 && lines.length > 0) restoreScroll();
      }}
      onScroll={(event) => {
        if (scrollKey && restoredRef.current === scrollKey) setScrollPosition(scrollKey, event.nativeEvent.contentOffset.y);
      }}
      scrollEventThrottle={200}
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
  foundLine: {
    marginHorizontal: -6,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 92, 231, 0.18)',
  },
  playingLine: {
    marginHorizontal: -6,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(29, 185, 84, 0.12)',
  },
  lineBlock: {
    marginBottom: 6,
  },
  noteRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  noteIcon: { marginTop: 3 },
  noteText: {
    flex: 1,
    color: Colors.textSecondary,
    fontStyle: 'italic',
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
  hiddenLine: {
    color: Colors.text,
    paddingVertical: 4,
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
