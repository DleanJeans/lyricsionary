import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Colors } from '../constants/theme';
import { getFlagForLanguage } from '../constants/languages';
import LyricsColumn from './LyricsColumn';

interface SideBySideEditorProps {
  originalLyrics: string;
  originalLanguages: string[];
  translationLyrics: string;
  translationLanguage: string;
  onOriginalChange: (text: string) => void;
  onTranslationChange: (text: string) => void;
  isWide?: boolean;
}

export default function SideBySideEditor({
  originalLyrics,
  originalLanguages,
  translationLyrics,
  translationLanguage,
  onOriginalChange,
  onTranslationChange,
  isWide,
}: SideBySideEditorProps) {
  const leftScrollRef = useRef<ScrollView>(null);
  const rightScrollRef = useRef<ScrollView>(null);
  const middleScrollRef = useRef<ScrollView>(null);
  const [activeScroll, setActiveScroll] = useState<'left' | 'right' | null>(null);

  const handleLeftScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (activeScroll !== 'left') return;
    const offsetY = event.nativeEvent.contentOffset.y;
    rightScrollRef.current?.scrollTo({ y: offsetY, animated: false });
    middleScrollRef.current?.scrollTo({ y: offsetY, animated: false });
  };

  const handleRightScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (activeScroll !== 'right') return;
    const offsetY = event.nativeEvent.contentOffset.y;
    leftScrollRef.current?.scrollTo({ y: offsetY, animated: false });
    middleScrollRef.current?.scrollTo({ y: offsetY, animated: false });
  };

  const handleLeftScrollEnd = () => {
    // Keep activeScroll set during momentum scrolling
    // Only clear it when momentum ends
  };

  const handleRightScrollEnd = () => {
    // Keep activeScroll set during momentum scrolling
    // Only clear it when momentum ends
  };

  // Get flags for languages
  const originalFlag = originalLanguages.length > 0 ? getFlagForLanguage(originalLanguages[0]) : '🌐';
  const translationFlag = getFlagForLanguage(translationLanguage);

  // Calculate number of lines for the middle column
  const maxLines = Math.max(
    originalLyrics.split('\n').length,
    translationLyrics.split('\n').length
  );

  return (
    <View style={[styles.container, isWide && styles.containerWide]}>
      <View style={styles.sideBySideContainer}>
        {/* Left side: Original lyrics */}
        <LyricsColumn
          ref={leftScrollRef}
          lyrics={originalLyrics}
          onLyricsChange={onOriginalChange}
          headerFlag={originalFlag}
          headerTitle="Original"
          onScrollBeginDrag={() => setActiveScroll('left')}
          onScrollEndDrag={handleLeftScrollEnd}
          onMomentumScrollEnd={() => setActiveScroll(null)}
          onScroll={handleLeftScroll}
          showLineNumbers={false}
          wrapLines={true}
        />

        {/* Divider */}
        <View style={styles.divider} />

        {/* Middle column: Line numbers */}
        <View style={styles.middleColumn}>
          <View style={styles.middleHeader} />
          <ScrollView
            ref={middleScrollRef}
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          >
            <View>
              {Array.from({ length: maxLines }).map((_, i) => (
                <View key={i} style={styles.lineNumberRow}>
                  <Text style={styles.lineNumberText}>{i + 1}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Right side: Translation */}
        <LyricsColumn
          ref={rightScrollRef}
          lyrics={translationLyrics}
          onLyricsChange={onTranslationChange}
          headerFlag={translationFlag}
          headerTitle={translationLanguage}
          onScrollBeginDrag={() => setActiveScroll('right')}
          onScrollEndDrag={handleRightScrollEnd}
          onMomentumScrollEnd={() => setActiveScroll(null)}
          onScroll={handleRightScroll}
          showLineNumbers={false}
          wrapLines={true}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 10,
  },
  containerWide: {
    flex: 3,
  },
  sideBySideContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  divider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  middleColumn: {
    width: 44,
  },
  middleHeader: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    height: 48,
  },
  scroll: {
    flex: 1,
  },
  lineNumberRow: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    height: 34,
    justifyContent: 'center',
  },
  lineNumberText: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
