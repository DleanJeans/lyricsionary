import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Colors } from '../constants/theme';

interface LyricsEditorProps {
  lyrics: string;
  onLyricsChange: (text: string) => void;
  showLineNumbers?: boolean;
  wrapLines?: boolean;
  referenceLines?: string[];
}

export default function LyricsEditor({
  lyrics,
  onLyricsChange,
  showLineNumbers = true,
  wrapLines = false,
  referenceLines,
}: LyricsEditorProps) {
  const lines = lyrics.split('\n');
  const hasReference = !!referenceLines && referenceLines.length > 0;
  const cursorRef = useRef<Record<number, number>>({});

  const handleBackspace = (e: any, line: string, i: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      const cursorPos = cursorRef.current[i] ?? line.length;
      if (cursorPos === 0 && i > 0) {
        e.preventDefault?.();
        const newLines = [...lines];
        if (line === '') {
          newLines.splice(i, 1);
        } else {
          newLines[i - 1] = newLines[i - 1] + newLines[i];
          newLines.splice(i, 1);
        }
        onLyricsChange(newLines.join('\n'));
      }
    }
  };

  const handleSelectionChange = (e: any, i: number) => {
    cursorRef.current[i] = e.nativeEvent.selection.start;
  };

  const renderLine = (line: string, i: number) => {
    const refLine = hasReference ? (i < referenceLines!.length ? referenceLines![i] : '') : null;

      return (
        <View
          key={i}
          style={hasReference ? styles.linePair : styles.lineSolo}
        >
          <View style={styles.line}>
            {showLineNumbers && <Text style={styles.lineNumber}>{i + 1}</Text>}
            {hasReference && <Text style={styles.referenceLineText}>{refLine}</Text>}
          </View>
          <View style={styles.line}>
            {hasReference && showLineNumbers && <View style={styles.lineNumberSpacer} />}
            <TextInput
              style={styles.lineInput}
              value={line}
              onChangeText={(text) => {
                const newLines = [...lines];
                newLines[i] = text;
                onLyricsChange(newLines.join('\n'));
              }}
              onKeyPress={(e) => handleBackspace(e, line, i)}
              onSelectionChange={(e) => handleSelectionChange(e, i)}
              multiline={wrapLines}
              scrollEnabled={false}
            />
          </View>
        </View>
      );
  };

  return (
    <View style={styles.column}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {lines.map((line, i) => renderLine(line, i))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  linePair: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lineSolo: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'flex-start',
  },
  line: {
    flexDirection: 'row',
    paddingHorizontal: 4,
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
  lineNumberSpacer: {
    width: 28,
    marginRight: 8,
  },
  referenceLineText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 2,
    paddingHorizontal: 4,
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
});
