import React, { useEffect, useRef, useState } from 'react';
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
  referenceLines?: string[];
  onFocus?: () => void;
}

export default function LyricsEditor({
  lyrics,
  onLyricsChange,
  showLineNumbers = true,
  referenceLines,
  onFocus,
}: LyricsEditorProps) {
  const lines = lyrics.split('\n');
  const hasReference = !!referenceLines && referenceLines.length > 0;
  const totalLines = hasReference ? Math.max(lines.length, referenceLines!.length) : lines.length;
  const cursorRef = useRef<Record<number, number>>({});
  const inputRefs = useRef<Record<number, any>>({});
  const [focusTarget, setFocusTarget] = useState<{ lineIndex: number; cursorPos?: number } | null>(null);
  const [lineGenerations, setLineGenerations] = useState<Record<number, number>>({});

  useEffect(() => {
    if (focusTarget) {
      const { lineIndex, cursorPos } = focusTarget;
      const ref = inputRefs.current[lineIndex];
      if (ref) {
        ref.focus();
        if (cursorPos !== undefined) {
          requestAnimationFrame(() => {
            ref.setNativeProps({ selection: { start: cursorPos, end: cursorPos } });
          });
        }
      }
      setFocusTarget(null);
    }
  }, [focusTarget, lines]);

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
        setFocusTarget({ lineIndex: i - 1, cursorPos: 0 });
      }
    }
  };

  const handleSelectionChange = (e: any, i: number) => {
    cursorRef.current[i] = e.nativeEvent.selection.start;
  };

  const handleChangeText = (text: string, i: number) => {
    if (text.includes('\n')) {
      const parts = text.split('\n');
      const newLines = [...lines];
      newLines.splice(i, 1, ...parts);
      onLyricsChange(newLines.join('\n'));
      setFocusTarget({ lineIndex: i + 1, cursorPos: 0 });
      setLineGenerations(prev => ({ ...prev, [i]: (prev[i] || 0) + 1 }));
      return;
    }
    const newLines = [...lines];
    newLines[i] = text;
    onLyricsChange(newLines.join('\n'));
  };

  const handleSubmitEditing = (i: number) => {
    const cursorPos = cursorRef.current[i] ?? lines[i].length;
    const currentLine = lines[i];
    const before = currentLine.substring(0, cursorPos);
    const after = currentLine.substring(cursorPos);
    const newLines = [...lines];
    newLines[i] = before;
    newLines.splice(i + 1, 0, after);
    onLyricsChange(newLines.join('\n'));
    setFocusTarget({ lineIndex: i + 1, cursorPos: 0 });
    setLineGenerations(prev => ({ ...prev, [i]: (prev[i] || 0) + 1 }));
  };

  const renderLineInput = (line: string, i: number) => (
    <TextInput
      ref={(el) => { if (el) inputRefs.current[i] = el; }}
      style={styles.lineInput}
      value={line}
      onChangeText={(text) => handleChangeText(text, i)}
      onKeyPress={(e) => handleBackspace(e, line, i)}
      onSelectionChange={(e) => handleSelectionChange(e, i)}
      onSubmitEditing={() => handleSubmitEditing(i)}
      multiline={true}
      blurOnSubmit={false}
      scrollEnabled={false}
      onFocus={onFocus}
    />
  );

  const renderLine = (i: number) => {
    const line = i < lines.length ? lines[i] : '';
    const lineKey = `${i}-${lineGenerations[i] || 0}`;
    if (!hasReference) {
      return (
        <View key={lineKey} style={styles.lineSolo}>
          {showLineNumbers && <Text style={styles.lineNumber}>{i + 1}</Text>}
          {renderLineInput(line, i)}
        </View>
      );
    }

    const refLine = referenceLines![i] ?? '';
    const hasLyricsRow = i < lines.length;
    return (
      <View key={lineKey} style={styles.linePair}>
        <View style={styles.line}>
          {showLineNumbers && <Text style={styles.lineNumber}>{i + 1}</Text>}
          <Text style={styles.referenceLineText}>{refLine}</Text>
        </View>
        {hasLyricsRow ? (
          <View style={styles.line}>
            {showLineNumbers && <View style={styles.lineNumberSpacer} />}
            {renderLineInput(line, i)}
          </View>
        ) : (
          <View style={styles.line}>
            {showLineNumbers && <View style={styles.lineNumberSpacer} />}
            <TextInput
              style={styles.lineInput}
              value=""
              placeholder="–"
              placeholderTextColor={Colors.textMuted}
              onChangeText={(text) => {
                const newLines = [...lines];
                while (newLines.length <= i) newLines.push('');
                newLines[i] = text;
                onLyricsChange(newLines.join('\n'));
              }}
              multiline={true}
              blurOnSubmit={false}
              scrollEnabled={false}
              onFocus={onFocus}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.column}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {Array.from({ length: totalLines }, (_, i) => renderLine(i))}
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  lineNumber: {
    width: 28,
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'right',
    marginRight: 8,
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
    textAlignVertical: 'top',
  },
});
