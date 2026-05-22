import React, { useRef, useState } from 'react';
import {
  View,
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
  const [isScrolling, setIsScrolling] = useState<'left' | 'right' | null>(null);

  const handleLeftScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isScrolling !== 'left') return;
    const offsetY = event.nativeEvent.contentOffset.y;
    rightScrollRef.current?.scrollTo({ y: offsetY, animated: false });
  };

  const handleRightScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isScrolling !== 'right') return;
    const offsetY = event.nativeEvent.contentOffset.y;
    leftScrollRef.current?.scrollTo({ y: offsetY, animated: false });
  };

  // Get flags for languages
  const originalFlag = originalLanguages.length > 0 ? getFlagForLanguage(originalLanguages[0]) : '🌐';
  const translationFlag = getFlagForLanguage(translationLanguage);

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
          onScrollBeginDrag={() => setIsScrolling('left')}
          onScrollEndDrag={() => setIsScrolling(null)}
          onMomentumScrollEnd={() => setIsScrolling(null)}
          onScroll={handleLeftScroll}
          lineNumberPosition="middle"
        />

        {/* Divider */}
        <View style={styles.divider} />

        {/* Right side: Translation */}
        <LyricsColumn
          ref={rightScrollRef}
          lyrics={translationLyrics}
          onLyricsChange={onTranslationChange}
          headerFlag={translationFlag}
          headerTitle={translationLanguage}
          onScrollBeginDrag={() => setIsScrolling('right')}
          onScrollEndDrag={() => setIsScrolling(null)}
          onMomentumScrollEnd={() => setIsScrolling(null)}
          onScroll={handleRightScroll}
          lineNumberPosition="middle"
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
});
