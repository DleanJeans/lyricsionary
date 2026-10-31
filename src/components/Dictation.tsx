import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Colors } from '../constants/theme';
import { checkDictation, type DictationMark, type DictationResult } from '../utils/dictation';

interface DictationProps {
  /** The hidden line */
  line: string;
  /** Plays the line on Spotify, stopping at its end */
  onPlay: () => void;
  onChecked: (checked: boolean) => void;
  onClose: () => void;
}

const MARK_COLORS: Record<DictationMark, string> = {
  right: Colors.success,
  close: Colors.warning,
  missed: Colors.danger,
};

/** Listen to a hidden line and type it, then see which words were right */
export default function Dictation({ line, onPlay, onChecked, onClose }: DictationProps) {
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<DictationResult | null>(null);

  const check = () => {
    if (!typed.trim()) return;
    setResult(checkDictation(line, typed));
    onChecked(true);
  };
  const retry = () => {
    setResult(null);
    setTyped('');
    onChecked(false);
    onPlay();
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Write what you hear</Text>
        <View style={styles.tools}>
          <TouchableOpacity onPress={onPlay} hitSlop={6} accessibilityRole="button" accessibilityLabel="Play the line again">
            <Ionicons name="play-circle" size={24} color={Colors.primaryLight} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} hitSlop={6} accessibilityRole="button" accessibilityLabel="Close dictation">
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
      {result ? (
        <>
          <Text style={styles.line}>
            {result.words.map((word, i) => (
              <Text key={i} style={[styles.line, { color: MARK_COLORS[word.mark] }, word.mark === 'missed' && styles.missed]}>
                {i > 0 ? ' ' : ''}
                {word.text}
              </Text>
            ))}
          </Text>
          {result.extra.length > 0 && (
            <Text style={styles.extra}>Not in the line: {result.extra.join(', ')}</Text>
          )}
          <View style={styles.footer}>
            <Text style={styles.score}>
              {result.right} of {result.words.length} right
              {result.words.some((w) => w.mark === 'close') ? ', yellow is only the accents' : ''}
            </Text>
            <TouchableOpacity onPress={retry} style={styles.button} accessibilityRole="button">
              <Text style={styles.buttonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            value={typed}
            onChangeText={setTyped}
            placeholder="Type the line..."
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            onSubmitEditing={check}
            returnKeyType="done"
            accessibilityLabel="The line you hear"
          />
          <TouchableOpacity
            onPress={check}
            style={[styles.button, styles.checkButton, !typed.trim() && styles.disabled]}
            disabled={!typed.trim()}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Check</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  line: { fontSize: 18, lineHeight: 26, color: Colors.text },
  missed: { textDecorationLine: 'underline' },
  extra: { fontSize: 13, color: Colors.textSecondary },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  score: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  button: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  checkButton: { alignSelf: 'flex-end' },
  disabled: { opacity: 0.5 },
  buttonText: { fontSize: 14, color: Colors.white, fontWeight: '600' },
});
