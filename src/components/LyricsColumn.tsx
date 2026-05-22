import React, { forwardRef } from 'react';
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

interface LyricsColumnProps {
  lyrics: string;
  onLyricsChange: (text: string) => void;
  headerFlag?: string;
  headerTitle?: string;
  showHeader?: boolean;
  onScrollBeginDrag?: () => void;
  onScrollEndDrag?: () => void;
  onMomentumScrollEnd?: () => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
  lineNumberPosition?: 'left' | 'middle';
}

const LyricsColumn = forwardRef<ScrollView, LyricsColumnProps>(
  (
    {
      lyrics,
      onLyricsChange,
      headerFlag,
      headerTitle,
      showHeader = true,
      onScrollBeginDrag,
      onScrollEndDrag,
      onMomentumScrollEnd,
      onScroll,
      scrollEventThrottle = 16,
      lineNumberPosition = 'left',
    },
    ref
  ) => {
    const lines = lyrics.split('\n');

    return (
      <View style={styles.column}>
        {showHeader && (
          <View style={styles.columnHeader}>
            {headerFlag && <Text style={styles.headerFlag}>{headerFlag}</Text>}
            {headerTitle && <Text style={styles.columnTitle}>{headerTitle}</Text>}
          </View>
        )}
        <ScrollView
          ref={ref}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={onScrollBeginDrag}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {lines.map((line, i) => (
                <View key={i} style={styles.line}>
                  {lineNumberPosition === 'left' && (
                    <Text style={styles.lineNumber}>{i + 1}</Text>
                  )}
                  <TextInput
                    style={[
                      styles.lineInput,
                      lineNumberPosition === 'middle' && styles.lineInputWithMiddleNumber,
                    ]}
                    value={line}
                    onChangeText={(text) => {
                      const newLines = [...lines];
                      newLines[i] = text;
                      onLyricsChange(newLines.join('\n'));
                    }}
                    onKeyPress={(e) => {
                      // Handle delete/backspace at position 0
                      if (e.nativeEvent.key === 'Backspace') {
                        const input = e.currentTarget as any;
                        const selectionStart = input.selectionStart || 0;

                        if (selectionStart === 0 && i > 0) {
                          // At position 0 and not first line
                          e.preventDefault();
                          const newLines = [...lines];
                          if (line === '') {
                            // Current line is empty, delete it
                            newLines.splice(i, 1);
                          } else {
                            // Join with previous line
                            newLines[i - 1] = newLines[i - 1] + newLines[i];
                            newLines.splice(i, 1);
                          }
                          onLyricsChange(newLines.join('\n'));
                        }
                      }
                    }}
                    multiline={true}
                    scrollEnabled={false}
                    numberOfLines={1}
                  />
                  {lineNumberPosition === 'middle' && (
                    <Text style={styles.lineNumberMiddle}>{i + 1}</Text>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      </View>
    );
  }
);

LyricsColumn.displayName = 'LyricsColumn';

const styles = StyleSheet.create({
  column: {
    flex: 1,
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
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'flex-start',
  },
  lineNumber: {
    width: 28,
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'right',
    marginRight: 8,
    marginVertical: 'auto',
  },
  lineNumberMiddle: {
    width: 28,
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginLeft: 8,
    marginVertical: 'auto',
  },
  lineInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 300,
    textAlignVertical: 'top',
  },
  lineInputWithMiddleNumber: {
    minWidth: 250,
  },
});

export default LyricsColumn;
