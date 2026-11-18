import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { getFlagForLanguage, isRomanized } from '../constants/languages';
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
    /** Selects the translation: its language, or "English 2" for a second one in a language */
    key: string;
    /** Set when the language has several translations, to tell them apart */
    label?: string;
    icon?: string | null;
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
  // Which occurrence of the word in its line is selected (1-based), to highlight the same one in the translation
  highlightOccurrence?: number;
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
  /** How much of the bottom a sheet covers, e.g. the word sheet: the lyrics scroll clear of it and center above it */
  bottomInset?: number;
  /** The lines on screen and a little around them, once the lyrics stop scrolling, e.g. to preload their words */
  onVisibleRange?: (range: { from: number; to: number }) => void;
  /** How many times each line's preloaded IPA changed, so only the lines that got some are drawn again */
  preloadedLines?: Record<number, number>;
}

function TranslationLine({
  text,
  icon,
  flag,
  fontSize,
  isBlurred,
  onPress,
  highlightDefinitions,
  highlightOccurrence,
}: {
  text: string;
  /** Shown at the start of the line with several translations: the site's icon, else the language's flag */
  icon?: string | null;
  flag?: string;
  fontSize: number;
  isBlurred: boolean;
  onPress: () => void;
  highlightDefinitions?: string[][];
  highlightOccurrence?: number;
}) {
  if (!text) return null;

  const highlights = !isBlurred && highlightDefinitions?.length
    ? findDefinitionHighlights(text, highlightDefinitions, highlightOccurrence)
    : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={isBlurred ? 0.7 : 1}
      style={[styles.translationContainer, styles.translationRow, isBlurred && styles.blurredContainer]}
    >
      {!isBlurred && (icon ? (
        <Image source={{ uri: icon }} style={styles.translationIcon} />
      ) : flag ? (
        <Text style={[styles.translationFlag, { fontSize: fontSize - 4 }]}>{flag}</Text>
      ) : null)}
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
  highlightOccurrence,
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
    ? line.translations.filter((translation) => translation.show && selectedLanguages.includes(translation.key))
    : [];
  // The romanized line reads the original out, so it sits right under it and is never blurred
  const romanized = shown.find((translation) => isRomanized(translation.language))?.text ||
    (showTranslations ? line.romanized : undefined);
  // Reversed, a line with a translation to go from is hidden until tapped, its romanization with it
  const hidden = (reverse && !!line.original.trim() && !revealedOriginals?.has(lineIndex) &&
    shown.some((translation) => !isRomanized(translation.language) && translation.text.trim())) ||
    lineIndex === dictationLineIndex;
  const note = getLineNote(lineNotes, line.original);
  // With several translations on, each starts with its site's icon or its language's flag
  const several = shown.filter((translation) => !isRomanized(translation.language) && translation.text.trim()).length > 1;
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
              icon={several ? translation.icon : undefined}
              flag={several ? getFlagForLanguage(translation.language) : undefined}
              fontSize={fontSize}
              isBlurred={!reverse && blurTranslations && !unblurredTranslations.has(translationKey)}
              onPress={() => onTranslationPress(lineIndex, translationIndex)}
              highlightDefinitions={lineIndex === highlightLineIndex ? highlightDefinitions : undefined}
              highlightOccurrence={lineIndex === highlightLineIndex ? highlightOccurrence : undefined}
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
      case 'highlightOccurrence':
        if (next.highlightLineIndex === i && prev.highlightOccurrence !== next.highlightOccurrence) return false;
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
      case 'bottomInset':
      case 'onVisibleRange':
        break;
      case 'preloadedLines':
        if (prev.preloadedLines?.[i] !== next.preloadedLines?.[i]) return false;
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
  const { lines, showSections, scrollToLine, scrollKey, bottomInset = 0 } = props;
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const lineRefs = useRef(new Map<number, View>());

  // The line to keep in the middle, and how tall the lyrics area is
  const centeringRef = useRef<number | null>(null);
  const viewportHeightRef = useRef(0);
  const bottomInsetRef = useRef(bottomInset);
  bottomInsetRef.current = bottomInset;
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
        scrollRef.current?.scrollTo({ y: Math.max(0, y + h / 2 - (viewportHeightRef.current - bottomInsetRef.current) / 2), animated: true })
      );
    }, 80);
  };
  useEffect(() => () => {
    if (centerTimerRef.current) clearTimeout(centerTimerRef.current);
  }, []);
  // A sheet covering more or less of the lyrics brings the line back to the middle of what's left
  useEffect(() => {
    if (centeringRef.current !== null) centerSoon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bottomInset]);

  // Leaving 1 by 1 shows every line again: keep the lyrics hidden until the line is back in place, so they don't scroll from the top
  const [hidden, setHidden] = useState(false);
  const hiddenRef = useRef(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reveal = () => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    hiddenRef.current = false;
    setHidden(false);
  };
  const prevOnlyLines = useRef(props.onlyLines);
  useLayoutEffect(() => {
    const prev = prevOnlyLines.current;
    prevOnlyLines.current = props.onlyLines;
    if (prev?.size === 1 && !props.onlyLines) {
      hiddenRef.current = true;
      setHidden(true);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      revealTimerRef.current = setTimeout(reveal, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.onlyLines]);
  useEffect(() => () => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
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
      if (!line || !contentRef.current) {
        if (hiddenRef.current) reveal();
        return;
      }
      const instant = hiddenRef.current;
      line.measureLayout(contentRef.current, (_x, y) => {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: !instant });
        if (instant) requestAnimationFrame(reveal);
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [scrollToLine]);

  const originals = lines.map((line) => line.original).join('\n');
  const sections = useMemo(
    () => (showSections ? detectSongSections(originals.split('\n')) : []),
    [originals, showSections]
  );

  // Tells which lines are on screen or just off it once scrolling settles, measured from where each line sits
  const scrollYRef = useRef(0);
  const visibleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRangeRef = useRef('');
  const reportVisibleSoon = () => {
    if (!latest.current.onVisibleRange) return;
    if (visibleTimerRef.current) clearTimeout(visibleTimerRef.current);
    visibleTimerRef.current = setTimeout(() => {
      const content = contentRef.current;
      const viewport = viewportHeightRef.current;
      if (!content || !viewport) return;
      const top = scrollYRef.current - viewport / 2;
      const bottom = scrollYRef.current + viewport * 1.5;
      const entries = [...lineRefs.current.entries()];
      let pending = entries.length;
      let from = Infinity;
      let to = -1;
      for (const [index, view] of entries) {
        view.measureLayout(content, (_x, y, _w, h) => {
          if (y + h >= top && y <= bottom) {
            from = Math.min(from, index);
            to = Math.max(to, index);
          }
          if (--pending === 0 && to >= 0) {
            const key = `${from}-${to}`;
            if (key === visibleRangeRef.current) return;
            visibleRangeRef.current = key;
            latest.current.onVisibleRange?.({ from, to });
          }
        }, () => {
          --pending;
        });
      }
    }, 300);
  };
  useEffect(() => () => {
    if (visibleTimerRef.current) clearTimeout(visibleTimerRef.current);
  }, []);

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
      style={[styles.lyricsScroll, hidden && { opacity: 0 }]}
      contentContainerStyle={[styles.lyricsContent, bottomInset > 0 && { paddingBottom: 40 + bottomInset }]}
      onLayout={(event) => {
        viewportHeightRef.current = event.nativeEvent.layout.height;
        reportVisibleSoon();
        if (centeringRef.current !== null) centerSoon();
      }}
      // Scrolling by hand stops the line being brought back to the middle
      onScrollBeginDrag={() => {
        centeringRef.current = null;
      }}
      onContentSizeChange={(_w, h) => {
        if (h > 0 && lines.length > 0) restoreScroll();
        reportVisibleSoon();
      }}
      onScroll={(event) => {
        scrollYRef.current = event.nativeEvent.contentOffset.y;
        reportVisibleSoon();
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
  translationLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 1,
  },
  translationIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
    marginTop: 4,
  },
  translationLabel: {
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 1,
  },
  translationLine: {
    flexShrink: 1,
    color: Colors.primaryLight,
    marginTop: 2,
  },
  translationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  translationFlag: {
    marginTop: 1,
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
