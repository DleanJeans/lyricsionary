import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from './Text'
import { Text } from './Text';
import { Colors } from '../constants/theme';
import {
  findRepeatedLines,
  applyEditToLines,
  findSplitTargets,
  applySplitToLines,
  findMergeTargets,
  applyMergeToLines,
  shiftIndexAfterResize,
} from '../utils/repeatedLines';

// The line being edited and its text when editing began, to spot its repeats.
interface Anchor {
  index: number;
  from: string;
}

// A split or merge that can be repeated on the matching lines.
type StructuralSync =
  | { kind: 'split'; index: number; original: string; parts: string[] }
  | { kind: 'merge'; index: number; first: string; second: string };

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
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [structural, setStructural] = useState<StructuralSync | null>(null);

  const editTargets = !structural && anchor && anchor.index < lines.length && lines[anchor.index] !== anchor.from
    ? findRepeatedLines(lines, anchor.from, anchor.index)
    : [];
  const structuralTargets = !structural
    ? []
    : structural.kind === 'split'
      ? findSplitTargets(lines, structural.original, structural.parts,
        structural.parts.map((_, k) => structural.index - structural.parts.length + 1 + k))
      : findMergeTargets(lines, structural.first, structural.second, structural.index);
  const syncTargets = structural ? structuralTargets : editTargets;
  const syncIndex = structural ? structural.index : anchor?.index;
  const syncTargetSet = new Set(syncTargets.flatMap((j) =>
    structural?.kind === 'merge' ? [j, j + 1] : [j]));

  // Lyrics replaced from outside (tab switch, paste, reset) invalidate the anchor.
  const emittedLyricsRef = useRef(lyrics);
  useEffect(() => {
    if (lyrics !== emittedLyricsRef.current) {
      emittedLyricsRef.current = lyrics;
      setAnchor(null);
      setStructural(null);
    }
  }, [lyrics]);

  const emitLines = (newLines: string[]) => {
    const text = newLines.join('\n');
    emittedLyricsRef.current = text;
    onLyricsChange(text);
  };

  const resetAnchor = (index: number, text: string) => {
    setAnchor({ index, from: text });
    setStructural(null);
  };

  const handleLineFocus = (i: number) => {
    setAnchor((prev) => (prev?.index === i ? prev : { index: i, from: lines[i] ?? '' }));
    setStructural((prev) => (prev?.index === i ? prev : null));
    onFocus?.();
  };

  const applySync = () => {
    if (syncIndex === undefined || syncTargets.length === 0) return;
    let newLines: string[];
    let index = syncIndex;
    if (!structural) {
      newLines = applyEditToLines(lines, syncTargets, lines[syncIndex]);
    } else if (structural.kind === 'split') {
      newLines = applySplitToLines(lines, syncTargets, structural.parts);
      index = shiftIndexAfterResize(syncIndex, syncTargets, structural.parts.length - 1);
    } else {
      newLines = applyMergeToLines(lines, syncTargets, structural.first + structural.second);
      index = shiftIndexAfterResize(syncIndex, syncTargets, -1);
    }
    emitLines(newLines);
    resetAnchor(index, newLines[index]);
  };

  const dismissSync = () => {
    if (syncIndex === undefined) return;
    resetAnchor(syncIndex, lines[syncIndex]);
  };

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
        const previousLineLength = newLines[i - 1].length;
        const first = newLines[i - 1];
        if (line === '') {
          newLines.splice(i, 1);
        } else {
          newLines[i - 1] = newLines[i - 1] + newLines[i];
          newLines.splice(i, 1);
        }
        emitLines(newLines);
        setAnchor({ index: i - 1, from: newLines[i - 1] });
        setStructural({ kind: 'merge', index: i - 1, first, second: line });
        setFocusTarget({ lineIndex: i - 1, cursorPos: previousLineLength });
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
      emitLines(newLines);
      const lastIndex = i + parts.length - 1;
      setAnchor({ index: lastIndex, from: parts[parts.length - 1] });
      setStructural({ kind: 'split', index: lastIndex, original: lines[i], parts });
      setFocusTarget({
        lineIndex: lastIndex,
        cursorPos: parts[parts.length - 1].length,
      });
      setLineGenerations(prev => ({ ...prev, [i]: (prev[i] || 0) + 1 }));
      return;
    }
    const newLines = [...lines];
    newLines[i] = text;
    emitLines(newLines);
    if (structural) resetAnchor(i, lines[i]);
  };

  const handleSubmitEditing = (i: number) => {
    const cursorPos = cursorRef.current[i] ?? lines[i].length;
    const currentLine = lines[i];
    const before = currentLine.substring(0, cursorPos);
    const after = currentLine.substring(cursorPos);
    const newLines = [...lines];
    newLines[i] = before;
    newLines.splice(i + 1, 0, after);
    emitLines(newLines);
    setAnchor({ index: i + 1, from: after });
    setStructural({ kind: 'split', index: i + 1, original: currentLine, parts: [before, after] });
    setFocusTarget({ lineIndex: i + 1, cursorPos: 0 });
    setLineGenerations(prev => ({ ...prev, [i]: (prev[i] || 0) + 1 }));
  };

  const renderLineNumber = (i: number) =>
    showLineNumbers && (
      <Pressable onPress={() => inputRefs.current[i]?.focus()}>
        <Text style={[styles.lineNumber, syncTargetSet.has(i) && styles.lineNumberSynced]}>{i + 1}</Text>
      </Pressable>
    );

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
      onFocus={() => handleLineFocus(i)}
    />
  );

  const syncLabel = () => {
    const n = syncTargets.length;
    const lineWord = n === 1 ? 'line' : 'lines';
    if (structural?.kind === 'split') return `Split ${n} matching ${lineWord} too`;
    if (structural?.kind === 'merge') return `Merge ${n} matching ${n === 1 ? 'pair' : 'pairs'} too`;
    return `Apply to ${n} matching ${lineWord}`;
  };

  const renderSyncBar = (i: number) =>
    i === syncIndex && syncTargets.length > 0 && (
      <View style={styles.syncBar}>
        {showLineNumbers && <View style={styles.lineNumberSpacer} />}
        <Pressable style={styles.syncButton} onPress={applySync}>
          <Ionicons name="copy-outline" size={14} color={Colors.white} />
          <Text style={styles.syncButtonText}>{syncLabel()}</Text>
        </Pressable>
        <Pressable style={styles.syncDismiss} onPress={dismissSync} hitSlop={8}>
          <Ionicons name="close" size={16} color={Colors.textMuted} />
        </Pressable>
      </View>
    );

  const renderLine = (i: number) => {
    const line = i < lines.length ? lines[i] : '';
    const lineKey = `${i}-${lineGenerations[i] || 0}`;
    if (!hasReference) {
      return (
        <View key={lineKey} style={styles.lineSoloWrap}>
          <View style={styles.lineSolo}>
            {renderLineNumber(i)}
            {renderLineInput(line, i)}
          </View>
          {renderSyncBar(i)}
        </View>
      );
    }

    const refLine = referenceLines![i] ?? '';
    const hasLyricsRow = i < lines.length;
    return (
      <View key={lineKey} style={styles.linePair}>
        <View style={styles.line}>
            {renderLineNumber(i)}
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
                emitLines(newLines);
              }}
              multiline={true}
              blurOnSubmit={false}
              scrollEnabled={false}
              onFocus={onFocus}
            />
          </View>
        )}
        {renderSyncBar(i)}
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
  lineSoloWrap: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lineSolo: {
    flexDirection: 'row',
    paddingVertical: 4,
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
    marginTop: 4,
  },
  lineNumberSynced: {
    color: Colors.primaryLight,
    fontWeight: '700',
  },
  syncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    gap: 8,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  syncButtonText: {
    color: Colors.white,
    fontSize: 13,
  },
  syncDismiss: {
    padding: 2,
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
