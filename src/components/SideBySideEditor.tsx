import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Colors } from '../constants/theme';
import { getFlagForLanguage } from '../constants/languages';

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

  const originalLines = originalLyrics.split('\n');
  const translationLines = translationLyrics.split('\n');

  // Get flags for languages
  const originalFlag = originalLanguages.length > 0 ? getFlagForLanguage(originalLanguages[0]) : '🌐';
  const translationFlag = getFlagForLanguage(translationLanguage);

  return (
    <View style={[styles.container, isWide && styles.containerWide]}>
      <View style={styles.sideBySideContainer}>
        {/* Left side: Original lyrics */}
        <View style={styles.column}>
          <View style={styles.columnHeader}>
            <Text style={styles.headerFlag}>{originalFlag}</Text>
            <Text style={styles.columnTitle}>Original</Text>
          </View>
          <ScrollView
            ref={leftScrollRef}
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={() => setIsScrolling('left')}
            onScrollEndDrag={() => setIsScrolling(null)}
            onMomentumScrollEnd={() => setIsScrolling(null)}
            onScroll={handleLeftScroll}
            scrollEventThrottle={16}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {originalLines.map((line, i) => (
                  <View key={i} style={styles.line}>
                    <Text style={styles.lineNumber}>{i + 1}</Text>
                    <TextInput
                      style={styles.lineInput}
                      value={line}
                      onChangeText={(text) => {
                        const newLines = [...originalLines];
                        newLines[i] = text;
                        onOriginalChange(newLines.join('\n'));
                      }}
                      multiline={true}
                      scrollEnabled={false}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Right side: Translation */}
        <View style={styles.column}>
          <View style={styles.columnHeader}>
            <Text style={styles.headerFlag}>{translationFlag}</Text>
            <Text style={styles.columnTitle}>{translationLanguage}</Text>
          </View>
          <ScrollView
            ref={rightScrollRef}
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={() => setIsScrolling('right')}
            onScrollEndDrag={() => setIsScrolling(null)}
            onMomentumScrollEnd={() => setIsScrolling(null)}
            onScroll={handleRightScroll}
            scrollEventThrottle={16}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {translationLines.map((line, i) => (
                  <View key={i} style={styles.line}>
                    <Text style={styles.lineNumber}>{i + 1}</Text>
                    <TextInput
                      style={styles.lineInput}
                      value={line}
                      onChangeText={(text) => {
                        const newLines = [...translationLines];
                        newLines[i] = text;
                        onTranslationChange(newLines.join('\n'));
                      }}
                      multiline={true}
                      scrollEnabled={false}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        </View>
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
  column: {
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 6,
  },
  headerFlag: {
    fontSize: 16,
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  scroll: {
    flex: 1,
  },
  line: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 40,
    alignItems: 'center',
  },
  lineNumber: {
    width: 28,
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'right',
    marginRight: 8,
  },
  lineInput: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 300,
  },
});
